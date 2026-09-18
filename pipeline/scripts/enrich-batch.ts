// Slow-lane enrichment batch: vietqr first, esgoo fills what vietqr still lacks.
// Usage: tsx pipeline/scripts/enrich-batch.ts [--province <slug>] [--limit N] [--spacing-ms N] [--max-minutes N] [--dry-run]
//   --province     e.g. ha-noi; omit for the whole store
//   --limit        max codes this run (default 500, hard cap 100000)
//   --spacing-ms   min ms between two calls to the same host (default 5000)
//   --max-minutes  stop cleanly at the checkpoint after this many minutes (default 0 = no limit)
//   --dry-run      call the real sources and log what would change, but write nothing to the database
// Each run processes at most --limit codes (or --max-minutes of wall time) and exits. Rerun to continue
// from the checkpoint. Merge rule: only null columns are filled; existing values are never overwritten.
// No phone, email, or ID-number fields are ever read or stored. No industries.
//
// 429 handling is per host, not per run: the first 429 on a host waits max(Retry-After, 60s) and retries
// once. If that retry also 429s, the host is disabled for the rest of this run (the other host keeps
// going). If both hosts end up disabled, the run saves its checkpoint and exits.
import { pathToFileURL } from "node:url";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { PROVINCES, provinceFromAddress } from "../province";
import { EsgooSource } from "../sources/esgoo";
import { VietqrSource } from "../sources/vietqr";
import { BusinessSource, CompanyData, SourceTransportError } from "../sources/types";

export const HARD_CAP = 100_000;
export const DEFAULT_LIMIT = 500;
export const DEFAULT_SPACING_MS = 5_000;
export const MIN_BLOCK_WAIT_MS = 60_000;
const CHECKPOINT_EVERY = 100;
const PROGRESS_EVERY = 100;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const FILLABLE = ["name", "nameForeign", "nameShort", "address", "status", "activeDate", "representativeName"] as const;
export type Fillable = (typeof FILLABLE)[number];

export type HostName = "vietqr" | "esgoo";
export interface HostState {
  blocked: boolean;
  lastCall: number;
}
export const freshHostStates = (): Record<HostName, HostState> => ({
  vietqr: { blocked: false, lastCall: 0 },
  esgoo: { blocked: false, lastCall: 0 },
});

/** Waits until `spacingMs` has passed since the host's last call, then marks the call as made now. */
export async function pace(state: HostState, spacingMs: number) {
  const due = state.lastCall + spacingMs - Date.now();
  if (due > 0) await sleep(due);
  state.lastCall = Date.now();
}

export type HostFetch =
  | { kind: "ok"; data: CompanyData }
  | { kind: "miss" }
  | { kind: "unavailable" } // host blocked, or just got blocked by this call
  | { kind: "abort" }; // non-429 transport error: caller should leave the row untouched

/**
 * One field-fetch through a paced, breaker-protected host. On a 429 it waits and retries once;
 * a second consecutive 429 disables the host (state.blocked = true) for the rest of the run.
 */
export async function fetchThroughHost(
  source: BusinessSource,
  host: HostName,
  taxCode: string,
  state: HostState,
  spacingMs: number,
  onCount429?: () => void,
): Promise<HostFetch> {
  if (state.blocked) return { kind: "unavailable" };
  for (let attempt = 0; attempt < 2; attempt++) {
    await pace(state, spacingMs);
    try {
      const r = await source.fetchByTaxCode(taxCode);
      return r.kind === "OK" ? { kind: "ok", data: r.data } : { kind: "miss" };
    } catch (err) {
      if (!(err instanceof SourceTransportError)) throw err;
      if (err.httpStatus !== 429) return { kind: "abort" };
      onCount429?.();
      if (attempt === 0) {
        const ra = source instanceof VietqrSource ? source.lastRetryAfter : null;
        const wait = Math.max(MIN_BLOCK_WAIT_MS, (ra ?? 0) * 1000);
        console.warn(`[${host}] 429, waiting ${wait / 1000}s then retrying once`);
        await sleep(wait);
        continue;
      }
      state.blocked = true;
      console.warn(`[${host}] second 429 in a row — disabling this host for the rest of the run`);
      return { kind: "unavailable" };
    }
  }
  return { kind: "unavailable" };
}

/** Fills only currently-null fields of `current` from `data`, mutating `merged`/`fill` in place. Returns true if anything filled. */
export function applyFill(merged: Record<string, unknown>, fill: Record<string, unknown>, data: CompanyData): boolean {
  let any = false;
  for (const f of FILLABLE) {
    if (merged[f] != null) continue;
    const v = data[f];
    if (v != null) {
      merged[f] = v;
      fill[f] = v;
      any = true;
    }
  }
  return any;
}

export function shouldStopForTime(startedAtMs: number, maxMinutes: number, nowMs = Date.now()): boolean {
  return maxMinutes > 0 && nowMs - startedAtMs >= maxMinutes * 60_000;
}

const stats = {
  processed: 0,
  filled: 0,
  ok: 0,
  skipped: 0,
  networkError: 0,
  count429: 0,
  provinces: {} as Record<string, number>,
};

async function processCode(
  taxCode: string,
  vietqr: VietqrSource,
  esgoo: EsgooSource,
  hostStates: Record<HostName, HostState>,
  spacingMs: number,
  dryRun: boolean,
) {
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
  const missing = () => FILLABLE.some((f) => merged[f] == null);

  let filledAny = false;
  for (const [source, host] of [
    [vietqr, "vietqr"],
    [esgoo, "esgoo"],
  ] as const) {
    if (host === "esgoo" && !missing()) break; // vietqr already has everything fillable
    const res = await fetchThroughHost(source, host, taxCode, hostStates[host], spacingMs, () => stats.count429++);
    if (res.kind === "abort") {
      stats.networkError++; // stays PENDING, retried next run
      return;
    }
    if (res.kind === "ok" && applyFill(merged, fill, res.data)) filledAny = true;
  }
  if (filledAny) stats.filled++;

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
  if (dryRun) {
    if (filledAny) console.log(`[dry-run] ${taxCode} would fill ${Object.keys(fill).join(", ")} -> ${complete ? "OK" : "SOURCE_MISS"}`);
    return;
  }
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
  const dryRun = args.includes("--dry-run");
  const slug = get("--province");
  const limitRaw = get("--limit");
  const limit = limitRaw === undefined ? DEFAULT_LIMIT : Number(limitRaw);
  const spacingRaw = get("--spacing-ms");
  const spacingMs = spacingRaw === undefined ? DEFAULT_SPACING_MS : Number(spacingRaw);
  const maxMinutesRaw = get("--max-minutes");
  const maxMinutes = maxMinutesRaw === undefined ? 0 : Number(maxMinutesRaw);
  const province = slug ? PROVINCES.find((p) => p.slug === slug) : undefined;
  if (
    (slug && !province) ||
    !Number.isInteger(limit) ||
    limit <= 0 ||
    !Number.isFinite(spacingMs) ||
    spacingMs < 0 ||
    !Number.isFinite(maxMinutes) ||
    maxMinutes < 0
  ) {
    console.error("usage: enrich-batch.ts [--province <slug>] [--limit N<=100000] [--spacing-ms N] [--max-minutes N] [--dry-run]");
    process.exit(1);
  }
  return { province, limit: Math.min(limit, HARD_CAP), spacingMs, maxMinutes, dryRun };
}

async function main() {
  const { province, limit, spacingMs, maxMinutes, dryRun } = parseArgs();
  const scope = `enrich-batch:${province?.slug ?? "all"}`;
  // Dry runs never touch the checkpoint: read the existing cursor (if any) without creating or moving it.
  const cp = dryRun
    ? await prisma.ingestCheckpoint.findUnique({ where: { scope } })
    : await prisma.ingestCheckpoint.upsert({ where: { scope }, create: { scope }, update: {} });
  let cursor = cp?.cursor ?? null;

  // Province filter: known slug, or (slug unknown) address mentions the province name.
  const provinceWhere: Prisma.CompanyWhereInput = province
    ? { OR: [{ provinceSlug: province.slug }, { provinceSlug: null, address: { contains: province.name } }] }
    : {};

  const vietqr = new VietqrSource();
  const esgoo = new EsgooSource();
  const hostStates = freshHostStates();
  const t0 = Date.now();
  console.log(
    `start scope=${scope} cursor=${cursor ?? "(beginning)"} limit=${limit} spacingMs=${spacingMs} maxMinutes=${maxMinutes || "none"}${dryRun ? " DRY-RUN (no writes)" : ""}`,
  );

  const save = (status: string) =>
    dryRun ? Promise.resolve() : prisma.ingestCheckpoint.update({ where: { scope }, data: { cursor, status } });

  const progress = () => {
    const elapsedMin = (Date.now() - t0) / 60_000;
    const perHour = elapsedMin > 0 ? Math.round((stats.processed / elapsedMin) * 60) : 0;
    console.log(
      `${stats.processed} done | filled ${stats.filled} ok ${stats.ok} skipped ${stats.skipped} | 429s ${stats.count429} | ` +
        `${elapsedMin.toFixed(1)} min elapsed | ~${perHour} codes/hour | cursor ${cursor}`,
    );
  };

  let bothHostsBlocked = false;
  let timeUp = false;
  let exhausted = false;
  let lastProgressAt = 0;
  outer: while (stats.processed < limit) {
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
      await processCode(taxCode, vietqr, esgoo, hostStates, spacingMs, dryRun);
      stats.processed++;
      cursor = taxCode;

      if (stats.processed - lastProgressAt >= PROGRESS_EVERY) {
        progress();
        lastProgressAt = stats.processed;
      }
      if (hostStates.vietqr.blocked && hostStates.esgoo.blocked) {
        bothHostsBlocked = true;
        break outer;
      }
      if (shouldStopForTime(t0, maxMinutes)) {
        timeUp = true;
        break outer;
      }
    }
    await save("pending");
  }

  await save(exhausted ? "done" : "pending");
  if (bothHostsBlocked) console.log("cả hai nguồn đều bị chặn (429) — đã lưu điểm dừng, chạy lại sau");
  else if (timeUp) console.log(`hết thời gian cho phép (--max-minutes ${maxMinutes}) — đã lưu điểm dừng`);
  else if (exhausted) console.log("hết mã PENDING trong phạm vi này");
  progress();
  console.log(
    JSON.stringify({
      scope,
      ...stats,
      minutes: +((Date.now() - t0) / 60_000).toFixed(2),
      spacingMs,
      maxMinutes,
      dryRun,
      blockedHosts: { vietqr: hostStates.vietqr.blocked, esgoo: hostStates.esgoo.blocked },
      bothHostsBlocked,
      timeUp,
      exhausted,
      cursor,
    }),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main()
    .catch((err) => {
      console.error(err instanceof Error ? err.message : "enrich-batch failed");
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
