// Background enrichment of PENDING companies: vietqr first, esgoo fills the fields vietqr lacks.
// Usage: tsx pipeline/scripts/enrich-backfill.ts (--limit N | --all) [--from-start]
//   --limit N     process at most N codes, then stop
//   --all         no limit (long-running; stop with Ctrl+C, rerun to resume)
//   --from-start  reset the cursor so PENDING codes skipped by earlier errors are retried
// Merge rule: only null columns are filled; existing values are never overwritten. No industries.
import { prisma } from "../db";
import { provinceFromAddress } from "../province";
import { EsgooSource } from "../sources/esgoo";
import { VietqrSource } from "../sources/vietqr";
import { BusinessSource, CompanyData, FetchResult, SourceTransportError } from "../sources/types";

const CHECKPOINT_SCOPE = "enrich-backfill";
const BATCH_SIZE = 50;

// Adaptive pacing, per source host.
const START_INTERVAL_MS = 3_000;
const MIN_INTERVAL_MS = 500; // never faster than 2 req/s per host
const MAX_INTERVAL_MS = 120_000;
const SPEEDUP_AFTER = 20; // consecutive successes before trying a shorter interval
const SPEEDUP_FACTOR = 0.85;
const MAX_429_RETRIES = 5;
const MAX_OTHER_RETRIES = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Spaces calls to one host; slows down on 429 and never returns below a rate that got blocked. */
class Pacer {
  interval = START_INTERVAL_MS;
  /** Shortest interval allowed after a block: a bit slower than the one that triggered it. */
  floor = MIN_INTERVAL_MS;
  blockedAt: number[] = [];
  private streak = 0;
  private last = 0;

  constructor(readonly name: string) {}

  async wait() {
    const due = this.last + this.interval - Date.now();
    if (due > 0) await sleep(due);
    this.last = Date.now();
  }

  ok() {
    if (++this.streak < SPEEDUP_AFTER) return;
    this.streak = 0;
    this.interval = Math.max(this.floor, Math.round(this.interval * SPEEDUP_FACTOR));
  }

  blocked(retryAfterSec: number | null) {
    this.blockedAt.push(this.interval);
    this.floor = Math.min(MAX_INTERVAL_MS, Math.max(this.floor, Math.round(this.interval * 1.25)));
    this.streak = 0;
    this.interval = Math.min(MAX_INTERVAL_MS, Math.max(this.interval * 2, (retryAfterSec ?? 0) * 1000));
    console.warn(`[${this.name}] 429 at ${this.blockedAt.at(-1)} ms; backing off to ${this.interval} ms`);
  }
}

type Outcome = { kind: "data"; result: FetchResult } | { kind: "error"; message: string };

/** One call through the pacer; retries 429 with backoff and other transport errors a few times. */
async function fetchPaced(source: BusinessSource, pacer: Pacer, taxCode: string): Promise<Outcome> {
  let throttled = 0;
  let failed = 0;
  for (;;) {
    await pacer.wait();
    try {
      const result = await source.fetchByTaxCode(taxCode);
      pacer.ok();
      return { kind: "data", result };
    } catch (err) {
      if (!(err instanceof SourceTransportError)) throw err;
      if (err.httpStatus === 429) {
        const retryAfter = source instanceof VietqrSource ? source.lastRetryAfter : null;
        pacer.blocked(retryAfter);
        if (++throttled > MAX_429_RETRIES) return { kind: "error", message: err.message };
      } else if (++failed > MAX_OTHER_RETRIES) {
        return { kind: "error", message: err.message };
      }
    }
  }
}

const FILLABLE = ["name", "nameForeign", "nameShort", "address", "status", "activeDate", "representativeName"] as const;
type Fillable = (typeof FILLABLE)[number];

const stats = {
  processed: 0,
  ok: 0,
  sourceMiss: 0,
  sourceMissPartial: 0, // got a name or address, but not both
  errors: 0,
  skippedRace: 0,
  missReasons: {} as Record<string, number>,
  errorMessages: {} as Record<string, number>,
};
const bump = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1);

async function processCode(taxCode: string, vietqr: VietqrSource, esgoo: EsgooSource, pacers: Record<string, Pacer>) {
  const results: CompanyData[] = [];
  for (const [source, pacer] of [
    [vietqr, pacers.vietqr],
    [esgoo, pacers.esgoo],
  ] as const) {
    const out = await fetchPaced(source, pacer, taxCode);
    if (out.kind === "error") {
      // Temporary failure: leave the row PENDING (untouched) for a later run.
      stats.errors++;
      bump(stats.errorMessages, out.message);
      return;
    }
    if (out.result.kind === "OK") results.push(out.result.data);
    else bump(stats.missReasons, `${out.result.source}: ${out.result.reason}`);
  }

  const current = await prisma.company.findUnique({
    where: { taxCode },
    select: { enrichStatus: true, province: true, provinceSlug: true, ...Object.fromEntries(FILLABLE.map((f) => [f, true])) },
  });
  if (!current || current.enrichStatus !== "PENDING") {
    stats.skippedRace++; // enriched meanwhile (e.g. by a page visit)
    return;
  }

  // Existing value first, then vietqr, then esgoo.
  const fill: Record<string, unknown> = {};
  const merged = { ...current } as Record<string, unknown>;
  for (const f of FILLABLE) {
    if (merged[f] != null) continue;
    const v = results.map((r) => r[f as Fillable]).find((x) => x != null);
    if (v != null) merged[f] = fill[f] = v;
  }
  if (merged.provinceSlug == null) {
    const province = provinceFromAddress(merged.address as string | null);
    if (province) {
      fill.province = province.displayName;
      fill.provinceSlug = province.slug;
    }
  }

  const complete = Boolean(merged.name && merged.address);
  const enrichStatus = complete ? "OK" : "SOURCE_MISS";
  if (complete) stats.ok++;
  else if (merged.name || merged.address) stats.sourceMissPartial++;
  else stats.sourceMiss++;

  // Conditional write: never clobber a row that left PENDING since we read it.
  const r = await prisma.company.updateMany({
    where: { taxCode, enrichStatus: "PENDING" },
    data: { ...fill, enrichStatus, lastEnrichedAt: new Date() },
  });
  if (r.count === 0) stats.skippedRace++;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--limit");
  const limit = i >= 0 ? Number(args[i + 1]) : null;
  const all = args.includes("--all");
  if ((limit === null) === !all || (limit !== null && !(Number.isInteger(limit) && limit > 0))) {
    console.error("usage: enrich-backfill.ts (--limit N | --all) [--from-start]");
    process.exit(1);
  }
  return { limit: limit ?? Infinity, fromStart: args.includes("--from-start") };
}

async function main() {
  const { limit, fromStart } = parseArgs();
  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) process.exit(130);
    stopping = true;
    console.warn("Stopping after the current code (Ctrl+C again to force)...");
  });

  const checkpoint = await prisma.ingestCheckpoint.upsert({
    where: { scope: CHECKPOINT_SCOPE },
    create: { scope: CHECKPOINT_SCOPE },
    update: {},
  });
  let cursor = fromStart ? null : checkpoint.cursor;
  await prisma.ingestCheckpoint.update({ where: { scope: CHECKPOINT_SCOPE }, data: { status: "running", cursor } });

  const vietqr = new VietqrSource();
  const esgoo = new EsgooSource();
  const pacers = { vietqr: new Pacer("vietqr"), esgoo: new Pacer("esgoo") };
  const t0 = Date.now();
  console.log(`start cursor=${cursor ?? "(beginning)"} limit=${limit}`);

  let exhausted = false;
  while (!stopping && stats.processed < limit) {
    const batch = await prisma.company.findMany({
      where: { enrichStatus: "PENDING", ...(cursor ? { taxCode: { gt: cursor } } : {}) },
      select: { taxCode: true },
      orderBy: { taxCode: "asc" },
      take: Math.min(BATCH_SIZE, limit - stats.processed),
    });
    if (batch.length === 0) {
      exhausted = true;
      break;
    }

    for (const { taxCode } of batch) {
      if (stopping) break;
      await processCode(taxCode, vietqr, esgoo, pacers);
      stats.processed++;
      cursor = taxCode;
    }

    await prisma.ingestCheckpoint.update({
      where: { scope: CHECKPOINT_SCOPE },
      data: { cursor, page: { increment: 1 } },
    });
    const min = (Date.now() - t0) / 60_000;
    console.log(
      `${stats.processed} done | ok ${stats.ok} miss ${stats.sourceMiss + stats.sourceMissPartial} err ${stats.errors}` +
        ` | ${(stats.processed / min).toFixed(1)} codes/min | interval vietqr ${pacers.vietqr.interval} ms, esgoo ${pacers.esgoo.interval} ms | cursor ${cursor}`,
    );
  }

  await prisma.ingestCheckpoint.update({
    where: { scope: CHECKPOINT_SCOPE },
    data: { cursor, status: exhausted ? "done" : "pending" },
  });

  const minutes = (Date.now() - t0) / 60_000;
  console.log(
    JSON.stringify(
      {
        ...stats,
        minutes: Number(minutes.toFixed(2)),
        codesPerMinute: Number((stats.processed / minutes).toFixed(1)),
        finalIntervalMs: { vietqr: pacers.vietqr.interval, esgoo: pacers.esgoo.interval },
        blockedAtIntervalMs: { vietqr: pacers.vietqr.blockedAt, esgoo: pacers.esgoo.blockedAt },
        cursor,
        exhausted,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "backfill failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
