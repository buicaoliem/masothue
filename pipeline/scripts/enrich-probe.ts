// Probe: enrich a capped sample of PENDING tax codes via no-captcha sources
// (vietqr first, esgoo fills the gaps) and measure coverage, blocking and speed.
// Merge rule: only non-null source values are written; existing values are never blanked.
// Logs contain tax codes and field presence flags only — never field values.
import { appendFileSync, writeFileSync } from "node:fs";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { EsgooSource } from "../sources/esgoo";
import { VietqrSource } from "../sources/vietqr";
import { CompanyData, FetchResult, SourceTransportError } from "../sources/types";

const HARD_CAP = 200;
const limit = Math.min(Number(process.argv[2] ?? HARD_CAP), HARD_CAP);
const logPath = process.argv[3] ?? "enrich-probe.jsonl";

const VIETQR_GAP_MS = 1100; // vietqr: X-RateLimit-Limit 2 per ~1s window
const ESGOO_GAP_MS = 550; // esgoo: stay under 2 req/s

const FIELDS = [
  "name", "nameForeign", "nameShort", "address", "status",
  "activeDate", "representativeName", "capital",
] as const;
type Field = (typeof FIELDS)[number];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Blocked extends Error {}

function pacer(gapMs: number) {
  let last = 0;
  return async () => {
    const wait = last + gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
  };
}

const stats = {
  vietqr: { requests: 0, ok: 0, miss: 0, err: 0, http429: 0, firstLimitAtRequest: null as number | null },
  esgoo: { requests: 0, ok: 0, miss: 0, err: 0, http429: 0, firstLimitAtRequest: null as number | null },
};

type Outcome = { kind: "OK" | "SOURCE_MISS" | "ERROR"; data?: CompanyData; reason?: string };

async function call(
  name: "vietqr" | "esgoo",
  fetchOnce: () => Promise<FetchResult>,
  pace: () => Promise<void>,
  retryAfter: () => number | null,
): Promise<Outcome> {
  const s = stats[name];
  for (let attempt = 0; attempt < 2; attempt++) {
    await pace();
    s.requests++;
    try {
      const r = await fetchOnce();
      if (r.kind === "OK") { s.ok++; return { kind: "OK", data: r.data }; }
      s.miss++;
      return { kind: "SOURCE_MISS", reason: r.reason };
    } catch (err) {
      if (!(err instanceof SourceTransportError)) throw err;
      const code = err.httpStatus;
      if (code === 403) throw new Blocked(`${name} HTTP 403 after ${s.requests} requests`);
      if (code === 429) {
        s.http429++;
        s.firstLimitAtRequest ??= s.requests;
        // Honor the server's Retry-After once; a second 429 in a row = blocked.
        if (attempt === 0) { await sleep(((retryAfter() ?? 2) + 0.5) * 1000); continue; }
        throw new Blocked(`${name} HTTP 429 twice in a row at request ${s.requests}`);
      }
      s.err++;
      return { kind: "ERROR", reason: err.message };
    }
  }
  return { kind: "ERROR", reason: "unreachable" };
}

async function pickSample(n: number): Promise<string[]> {
  // Round-robin across province prefixes (first 2 digits), random within each.
  const rows = await prisma.$queryRaw<{ taxCode: string }[]>`
    WITH r AS (
      SELECT "taxCode",
             row_number() OVER (PARTITION BY substr("taxCode",1,2) ORDER BY random()) rn
      FROM "Company" WHERE "enrichStatus" = 'PENDING'
    )
    SELECT "taxCode" FROM r WHERE rn <= 10 ORDER BY rn, random() LIMIT ${n}`;
  return rows.map((r) => r.taxCode);
}

async function main() {
  const vietqr = new VietqrSource();
  const esgoo = new EsgooSource();
  const paceV = pacer(VIETQR_GAP_MS);
  const paceE = pacer(ESGOO_GAP_MS);

  const codes = await pickSample(limit);
  writeFileSync(logPath, "");
  console.log(`sample=${codes.length} prefixes=${new Set(codes.map((c) => c.slice(0, 2))).size}`);

  const t0 = Date.now();
  let processed = 0;
  let stopReason: string | null = null;
  const tally = { OK: 0, SOURCE_MISS: 0, PENDING: 0, fullNameAddrStatus: 0 };
  const present: Record<Field, number> = Object.fromEntries(FIELDS.map((f) => [f, 0])) as Record<Field, number>;

  try {
    for (const taxCode of codes.slice(0, HARD_CAP)) {
      const [v, e] = await Promise.all([
        call("vietqr", () => vietqr.fetchByTaxCode(taxCode), paceV, () => vietqr.lastRetryAfter),
        call("esgoo", () => esgoo.fetchByTaxCode(taxCode), paceE, () => null),
      ]);

      // vietqr wins; esgoo fills fields vietqr did not return.
      const merged: Partial<Record<Field, unknown>> = {};
      for (const f of FIELDS) {
        const val = v.data?.[f] ?? e.data?.[f] ?? null;
        if (val !== null) merged[f] = val;
      }

      const existing = await prisma.company.findUnique({ where: { taxCode } });
      const final = { ...existing, ...merged } as Record<string, unknown>;
      const bothMiss = v.kind === "SOURCE_MISS" && e.kind === "SOURCE_MISS";
      const enrichStatus = final.name && final.address ? "OK" : bothMiss ? "SOURCE_MISS" : "PENDING";

      const update: Prisma.CompanyUpdateInput = {};
      for (const [k, val] of Object.entries(merged)) {
        (update as Record<string, unknown>)[k] = k === "capital" ? new Prisma.Decimal(val as string) : val;
      }
      if (enrichStatus !== "PENDING") update.enrichStatus = enrichStatus;
      if (v.kind !== "ERROR" || e.kind !== "ERROR") update.lastEnrichedAt = new Date();
      await prisma.company.update({ where: { taxCode }, data: update });

      processed++;
      tally[enrichStatus]++;
      if (final.name && final.address && final.status) tally.fullNameAddrStatus++;
      for (const f of FIELDS) if (final[f] !== null && final[f] !== undefined) present[f]++;

      appendFileSync(logPath, JSON.stringify({
        taxCode, vietqr: v.kind, esgoo: e.kind,
        vReason: v.kind === "OK" ? undefined : v.reason, eReason: e.kind === "OK" ? undefined : e.reason,
        enrichStatus, has: FIELDS.filter((f) => final[f] !== null && final[f] !== undefined),
      }) + "\n");
      if (processed % 20 === 0) {
        const min = (Date.now() - t0) / 60000;
        console.log(`${processed} done, ${(processed / min).toFixed(1)}/min, 429 v=${stats.vietqr.http429} e=${stats.esgoo.http429}`);
      }
    }
  } catch (err) {
    if (!(err instanceof Blocked)) throw err;
    stopReason = err.message;
  }

  const minutes = (Date.now() - t0) / 60000;
  const perMin = processed / minutes;
  const summary = {
    processed, stopReason, minutes: +minutes.toFixed(2), perMin: +perMin.toFixed(1),
    daysFor2M: +(2_051_826 / perMin / 60 / 24).toFixed(1),
    tally, present, sources: stats,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "probe failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
