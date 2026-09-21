// Stage "map" for industries from the provincial open-data files (see pipeline/opendata.ts).
// Whitelist again: only the tax-code column and the industry columns are read; every other column
// (ID numbers, phone, email, owners...) is never touched.
//
// What each source really says (verified against the files in tmp/opendata):
//  - hcm       "NganhNghe": every registered industry, NO primary marker (the first entry is often unrelated)
//              -> mode "set": compact CompanyIndustrySet row, primary stays UNKNOWN, mainIndustry untouched.
//  - sonla     "Ngành nghề KD chính": the primary industry            -> mode "rows" (CompanyIndustry)
//  - quangngai "Ngành nghề KD chính" + "Ngành nghề KD" (all)          -> mode "rows" (CompanyIndustry)
import { classifyIndustries, parseIndustryListDetailed, type IndustryEntry } from "@/lib/industry/normalize";
import { emptyIndustryStats, persistIndustries, type IndustryInput, type IndustryStats } from "@/lib/industry/persist";
import { emptySetStats, loadCatalogCodes, persistIndustrySets, type SetImportStats } from "@/lib/industry/set";
import type { Sql } from "@/lib/directory/sql";
import { validateMst } from "@/lib/tools/mst";
import { SOURCES, type SourceKey } from "./opendata";

type Columns = { taxCode: string; primary?: string; all?: string; mode: "rows" | "set" };

export const INDUSTRY_COLUMNS: Record<SourceKey, Columns> = {
  hcm: { taxCode: "MaSoDN", all: "NganhNghe", mode: "set" },
  sonla: { taxCode: "Mã số doanh nghiệp", primary: "Ngành nghề KD chính", mode: "rows" },
  quangngai: { taxCode: "Mã số doanh nghiệp", primary: "Ngành nghề KD chính", all: "Ngành nghề KD", mode: "rows" },
};

const clean = (h: unknown) => String(h ?? "").replace(/^﻿/, "").normalize("NFC").trim();

export type MapCounters = { malformedEntries: number; duplicateEntries: number };

/** Header -> row mapper. Rows with an invalid MST (or no industry at all) map to null. */
export function makeIndustryMapper(source: SourceKey, header: readonly string[], counters?: MapCounters) {
  const cols = INDUSTRY_COLUMNS[source];
  const at = (name: string | undefined) => {
    if (!name) return -1;
    const i = header.findIndex((h) => clean(h) === name);
    if (i < 0) throw new Error(`${source}: missing column "${name}"`);
    return i;
  };
  const iTax = at(cols.taxCode);
  const iPrimary = at(cols.primary);
  const iAll = at(cols.all);
  const parse = (v: unknown): IndustryEntry[] => {
    const r = parseIndustryListDetailed(v);
    if (counters) {
      counters.malformedEntries += r.malformed;
      counters.duplicateEntries += r.duplicates;
    }
    return r.entries;
  };

  return (cells: readonly unknown[]): IndustryInput | null => {
    const mst = validateMst(String(cells[iTax] ?? ""));
    if (!mst.valid) return null;
    const primary = iPrimary >= 0 ? (parse(cells[iPrimary])[0] ?? null) : null;
    const all = iAll >= 0 ? parse(cells[iAll]) : [];
    const { primary: p, others } = classifyIndustries(primary, all);
    if (!p && others.length === 0) return null;
    return { taxCode: mst.normalized, primary: p, others };
  };
}

export const INDUSTRY_BATCH = 500;
const scope = (source: SourceKey) => `industries-${source}`;

export async function readIndustryCheckpoint(sql: Sql, source: SourceKey): Promise<number | null> {
  const rows = await sql.query<{ cursor: string | null }>(`SELECT cursor FROM "IngestCheckpoint" WHERE scope = $1`, [scope(source)]);
  const n = Number(rows[0]?.cursor);
  return rows[0]?.cursor != null && Number.isInteger(n) ? n : null;
}

async function writeCheckpoint(sql: Sql, source: SourceKey, nextRow: number, done: boolean) {
  await sql.query(
    `INSERT INTO "IngestCheckpoint" (id, scope, cursor, status, "updatedAt") VALUES ($1, $1, $2, $3, now())
     ON CONFLICT (scope) DO UPDATE SET cursor = EXCLUDED.cursor, status = EXCLUDED.status, "updatedAt" = now()`,
    [scope(source), String(nextRow), done ? "done" : "running"],
  );
}

export type IndustryImportResult = {
  mode: "rows" | "set";
  stats: IndustryStats;
  setStats: SetImportStats;
  frequency: Map<string, number>;
  uniqueCodes: Set<string>;
  counters: MapCounters;
  start: number;
  nextRow: number;
  invalidOrEmpty: number;
  failedBatches: number;
};

/**
 * Streams the rows of one file into the right storage for that source (see INDUSTRY_COLUMNS.mode).
 * Idempotent (re-running adds nothing); resumable through the checkpoint; a failing batch is logged
 * and skipped, the run continues. Dry run (apply=false) writes nothing, including the checkpoint.
 */
export async function runIndustryImport(
  sql: Sql,
  source: SourceKey,
  header: readonly string[],
  rows: AsyncIterable<readonly unknown[]> | Iterable<readonly unknown[]>,
  opts: {
    apply: boolean;
    limit: number;
    offset?: number;
    onBatch?: (r: { stats: IndustryStats; setStats: SetImportStats }, nextRow: number) => void;
    onError?: (err: unknown, atRow: number) => void;
  },
): Promise<IndustryImportResult> {
  const cols = INDUSTRY_COLUMNS[source];
  const counters: MapCounters = { malformedEntries: 0, duplicateEntries: 0 };
  const map = makeIndustryMapper(source, header, counters);
  const cfg = SOURCES[source];
  const prov = { source: cfg.dataSource, sourceUpdatedAt: cfg.dataAsOf };
  const start = opts.offset ?? (await readIndustryCheckpoint(sql, source)) ?? 0;
  const stats = emptyIndustryStats();
  const setStats = emptySetStats();
  const frequency = new Map<string, number>();
  const uniqueCodes = new Set<string>();
  const knownCodes = cols.mode === "set" ? await loadCatalogCodes(sql) : new Set<string>();
  let invalidOrEmpty = 0;
  let failedBatches = 0;
  let batch: IndustryInput[] = [];
  let rowIndex = 0;
  let exhausted = true;

  const flush = async (done: boolean) => {
    try {
      if (cols.mode === "set") {
        await persistIndustrySets(
          sql,
          batch.map((b) => ({ taxCode: b.taxCode, entries: [...(b.primary ? [b.primary] : []), ...b.others] })),
          prov,
          { apply: opts.apply, stats: setStats, knownCodes, frequency, uniqueCodes },
        );
      } else {
        await persistIndustries(sql, batch, prov, { apply: opts.apply, stats });
      }
      if (opts.apply) await writeCheckpoint(sql, source, rowIndex, done);
    } catch (err) {
      failedBatches++;
      opts.onError?.(err, rowIndex);
    }
    batch = [];
    opts.onBatch?.({ stats, setStats }, rowIndex);
  };

  for await (const cells of rows) {
    if (rowIndex < start) {
      rowIndex++;
      continue;
    }
    if (rowIndex >= start + opts.limit) {
      exhausted = false;
      break;
    }
    const rec = map(cells);
    if (rec) batch.push(rec);
    else invalidOrEmpty++;
    rowIndex++;
    if (batch.length >= INDUSTRY_BATCH) await flush(false);
  }
  if (batch.length > 0 || (opts.apply && exhausted)) await flush(exhausted);
  return { mode: cols.mode, stats, setStats, frequency, uniqueCodes, counters, start, nextRow: rowIndex, invalidOrEmpty, failedBatches };
}
