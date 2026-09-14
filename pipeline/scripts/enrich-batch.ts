// Short, self-terminating enrichment batch: vietqr first, esgoo fills what vietqr lacks.
// Usage: tsx pipeline/scripts/enrich-batch.ts [--province <slug>] [--limit N]
//   --province  e.g. ha-noi; omit for the whole store
//   --limit     max codes this run (default 500, hard cap 500)
// Each run processes at most --limit codes and exits. Rerun to continue from the checkpoint.
// On a persistent 429 (one short backoff + one retry) it saves the checkpoint and exits.
// Merge rule: only null columns are filled; existing values are never overwritten. No industries.
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { PROVINCES, provinceFromAddress } from "../province";
import { EsgooSource } from "../sources/esgoo";
import { VietqrSource } from "../sources/vietqr";
import { BusinessSource, CompanyData, SourceTransportError } from "../sources/types";

const HARD_CAP = 500;
const CHECKPOINT_EVERY = 50;
const INTERVAL_MS = 1_500; // spacing between calls to the same host
const BACKOFF_MS = 30_000; // single wait after a 429
const MAX_BACKOFF_MS = 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class RateLimited extends Error {}

const lastCall: Record<string, number> = {};
async function call(source: BusinessSource, host: string, taxCode: string) {
  const due = (lastCall[host] ?? 0) + INTERVAL_MS - Date.now();
  if (due > 0) await sleep(due);
  lastCall[host] = Date.now();
  return source.fetchByTaxCode(taxCode);
}

/** Returns the fetch result, null on a non-429 transport error, or throws RateLimited after one retry. */
async function fetchOnce(source: BusinessSource, host: string, taxCode: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await call(source, host, taxCode);
    } catch (err) {
      if (!(err instanceof SourceTransportError)) throw err;
      if (err.httpStatus !== 429) return null;
      if (attempt === 1) throw new RateLimited(host);
      const ra = source instanceof VietqrSource ? source.lastRetryAfter : null;
      const wait = Math.min(MAX_BACKOFF_MS, Math.max(BACKOFF_MS, (ra ?? 0) * 1000));
      console.warn(`[${host}] 429, waiting ${wait / 1000}s then retrying once`);
      await sleep(wait);
    }
  }
  return null;
}

const FILLABLE = ["name", "nameForeign", "nameShort", "address", "status", "activeDate", "representativeName"] as const;
const stats = { processed: 0, ok: 0, sourceMiss: 0, networkError: 0, skipped: 0, provinces: {} as Record<string, number> };

async function processCode(taxCode: string, vietqr: VietqrSource, esgoo: EsgooSource) {
  const results: CompanyData[] = [];
  for (const [source, host] of [
    [vietqr, "vietqr"],
    [esgoo, "esgoo"],
  ] as const) {
    const r = await fetchOnce(source, host, taxCode);
    if (r === null) {
      stats.networkError++; // stays PENDING
      return;
    }
    if (r.kind === "OK") results.push(r.data);
  }

  const current = await prisma.company.findUnique({
    where: { taxCode },
    select: { enrichStatus: true, provinceSlug: true, ...Object.fromEntries(FILLABLE.map((f) => [f, true])) },
  });
  if (!current || current.enrichStatus !== "PENDING") {
    stats.skipped++;
    return;
  }

  const fill: Record<string, unknown> = {};
  const merged = { ...current } as Record<string, unknown>;
  for (const f of FILLABLE) {
    if (merged[f] != null) continue;
    const v = results.map((r) => r[f]).find((x) => x != null);
    if (v != null) merged[f] = fill[f] = v;
  }
  if (merged.provinceSlug == null) {
    const province = provinceFromAddress(merged.address as string | null);
    if (province) {
      fill.province = province.displayName;
      fill.provinceSlug = province.slug;
    }
  }

  const slug = (fill.provinceSlug ?? merged.provinceSlug) as string | null;
  if (slug) stats.provinces[slug] = (stats.provinces[slug] ?? 0) + 1;

  const complete = Boolean(merged.name && merged.address);
  if (complete) stats.ok++;
  else stats.sourceMiss++;
  const w = await prisma.company.updateMany({
    where: { taxCode, enrichStatus: "PENDING" },
    data: { ...fill, enrichStatus: complete ? "OK" : "SOURCE_MISS", lastEnrichedAt: new Date() },
  });
  if (w.count === 0) stats.skipped++;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (k: string) => {
    const i = args.indexOf(k);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const slug = get("--province");
  const limitRaw = get("--limit");
  const limit = limitRaw === undefined ? HARD_CAP : Number(limitRaw);
  const province = slug ? PROVINCES.find((p) => p.slug === slug) : undefined;
  if ((slug && !province) || !Number.isInteger(limit) || limit <= 0) {
    console.error("usage: enrich-batch.ts [--province <slug>] [--limit N<=500]");
    process.exit(1);
  }
  return { province, limit: Math.min(limit, HARD_CAP) };
}

async function main() {
  const { province, limit } = parseArgs();
  const scope = `enrich-batch:${province?.slug ?? "all"}`;
  const cp = await prisma.ingestCheckpoint.upsert({ where: { scope }, create: { scope }, update: {} });
  let cursor = cp.cursor;

  // Province filter: known slug, or (slug unknown) address mentions the province name.
  const provinceWhere: Prisma.CompanyWhereInput = province
    ? { OR: [{ provinceSlug: province.slug }, { provinceSlug: null, address: { contains: province.name } }] }
    : {};

  const vietqr = new VietqrSource();
  const esgoo = new EsgooSource();
  const t0 = Date.now();
  console.log(`start scope=${scope} cursor=${cursor ?? "(beginning)"} limit=${limit}`);

  const save = (status: string) =>
    prisma.ingestCheckpoint.update({ where: { scope }, data: { cursor, status } });

  let blocked = false;
  let exhausted = false;
  try {
    while (stats.processed < limit) {
      const batch = await prisma.company.findMany({
        where: { enrichStatus: "PENDING", ...provinceWhere, ...(cursor ? { taxCode: { gt: cursor } } : {}) },
        select: { taxCode: true },
        orderBy: { taxCode: "asc" },
        take: Math.min(CHECKPOINT_EVERY, limit - stats.processed),
      });
      if (batch.length === 0) {
        exhausted = true;
        break;
      }
      for (const { taxCode } of batch) {
        await processCode(taxCode, vietqr, esgoo);
        stats.processed++;
        cursor = taxCode;
      }
      await save("pending");
      console.log(`${stats.processed} done | ok ${stats.ok} miss ${stats.sourceMiss} netErr ${stats.networkError} | cursor ${cursor}`);
    }
  } catch (err) {
    if (!(err instanceof RateLimited)) throw err;
    blocked = true; // cursor is the last fully processed code, so the blocked one is retried next run
  }

  await save(exhausted ? "done" : "pending");
  if (blocked) console.log(`bị khóa (${stats.processed} mã đã xử), chạy lại sau`);
  else if (exhausted) console.log("hết mã PENDING trong phạm vi này");
  console.log(JSON.stringify({ scope, ...stats, minutes: +((Date.now() - t0) / 60_000).toFixed(2), blocked, exhausted, cursor }));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "enrich-batch failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
