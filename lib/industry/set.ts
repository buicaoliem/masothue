import type { Sql } from "@/lib/directory/sql";
import { normalizeCodeSet, type IndustryEntry } from "./normalize";

// Compact storage of dense "registered industries" lists (HCM open data) as ONE row per (company, source)
// holding a sorted, de-duplicated text[] of VSIC codes, instead of ~20 CompanyIndustry rows per company.
//
// Semantics (must not drift):
//  - membership only: a set NEVER implies a primary industry, and Company.mainIndustry is never touched here;
//  - rows are only added or grown (codes are unioned with what is stored); nothing is deleted;
//  - hidden, removal-requested and not-yet-enriched companies are skipped, like the row-based path;
//  - names are not stored: they come from IndustryCatalog (new codes are added to it here, first-seen name wins).

export type IndustrySetInput = { taxCode: string; entries: IndustryEntry[] };

export type SetImportStats = {
  seen: number;
  companyNotFound: number;
  skippedHiddenOrRemoval: number;
  skippedNotListable: number;
  companiesMatched: number;
  companiesWithIndustries: number;
  memberships: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsUnchanged: number;
  newCatalogCodes: number;
  estimatedBytes: number;
};

export const emptySetStats = (): SetImportStats => ({
  seen: 0, companyNotFound: 0, skippedHiddenOrRemoval: 0, skippedNotListable: 0, companiesMatched: 0,
  companiesWithIndustries: 0, memberships: 0, rowsInserted: 0, rowsUpdated: 0, rowsUnchanged: 0, newCatalogCodes: 0, estimatedBytes: 0,
});

/** Rough heap+key estimate per row; the benchmark measures the real figure, this only sizes dry runs. */
export const estimateSetRowBytes = (codeCount: number) => 90 + 6 * codeCount;

export type SetProvenance = { source: string; sourceUpdatedAt: string | null };

/** Union of two code lists, sorted and de-duplicated. */
export const unionCodes = (a: readonly string[], b: readonly string[]) => normalizeCodeSet([...a, ...b]);

type CompanyRow = { id: string; taxCode: string; isHidden: boolean; enrichStatus: string; removal: boolean };

export async function persistIndustrySets(
  sql: Sql,
  inputs: readonly IndustrySetInput[],
  prov: SetProvenance,
  opts: {
    apply: boolean;
    stats: SetImportStats;
    /** Catalog codes known so far; mutated as new codes are met. */
    knownCodes: Set<string>;
    /** Optional: code -> number of matched companies (dry-run distribution). */
    frequency?: Map<string, number>;
    /** Optional: distinct codes seen among matched companies. */
    uniqueCodes?: Set<string>;
  },
): Promise<void> {
  const { stats } = opts;
  const merged = new Map<string, Map<string, string>>(); // taxCode -> code -> name
  for (const i of inputs) {
    stats.seen++;
    const m = merged.get(i.taxCode) ?? new Map<string, string>();
    for (const e of i.entries) if (!m.has(e.code)) m.set(e.code, e.name);
    merged.set(i.taxCode, m);
  }
  if (merged.size === 0) return;

  const work = async (tx: Sql) => {
    const companies = await tx.query<CompanyRow>(
      `SELECT c.id, c."taxCode", c."isHidden", c."enrichStatus"::text AS "enrichStatus",
              EXISTS (SELECT 1 FROM "RemovalRequest" r WHERE r."taxCode" = c."taxCode") AS removal
       FROM "Company" c WHERE c."taxCode" = ANY($1::text[])`,
      [[...merged.keys()]],
    );
    const byTax = new Map(companies.map((c) => [c.taxCode, c]));
    const existing = companies.length
      ? await tx.query<{ companyId: string; codes: string[] }>(
          `SELECT "companyId", codes FROM "CompanyIndustrySet" WHERE source = $1 AND "companyId" = ANY($2::text[])`,
          [prov.source, companies.map((c) => c.id)],
        )
      : [];
    const existingBy = new Map(existing.map((e) => [e.companyId, e.codes]));

    const writes: { companyId: string; codes: string[]; isNew: boolean }[] = [];
    const newCatalog = new Map<string, string>();
    for (const [taxCode, names] of merged) {
      const c = byTax.get(taxCode);
      if (!c) {
        stats.companyNotFound++;
        continue;
      }
      if (c.isHidden || c.removal) {
        stats.skippedHiddenOrRemoval++;
        continue;
      }
      if (c.enrichStatus !== "OK") {
        stats.skippedNotListable++;
        continue;
      }
      stats.companiesMatched++;
      const incoming = normalizeCodeSet([...names.keys()]);
      if (incoming.length === 0) continue; // empty list: no record
      stats.companiesWithIndustries++;
      stats.memberships += incoming.length;
      for (const code of incoming) {
        opts.frequency?.set(code, (opts.frequency.get(code) ?? 0) + 1);
        opts.uniqueCodes?.add(code);
        if (!opts.knownCodes.has(code)) {
          opts.knownCodes.add(code);
          newCatalog.set(code, names.get(code)!);
        }
      }
      const prev = existingBy.get(c.id);
      const next = prev ? unionCodes(prev, incoming) : incoming;
      if (prev && next.length === prev.length) {
        stats.rowsUnchanged++;
        continue;
      }
      if (prev) stats.rowsUpdated++;
      else stats.rowsInserted++;
      stats.estimatedBytes += estimateSetRowBytes(next.length);
      writes.push({ companyId: c.id, codes: next, isNew: !prev });
    }
    stats.newCatalogCodes += newCatalog.size;
    if (!opts.apply) return;

    if (newCatalog.size) {
      const codes = [...newCatalog.keys()];
      await tx.query(
        `INSERT INTO "IndustryCatalog" (code, name, level, source, "createdAt", "updatedAt")
         SELECT v.code, v.name, length(v.code), 'observed-in-source-data', now(), now()
         FROM unnest($1::text[], $2::text[]) AS v(code, name)
         ON CONFLICT (code) DO NOTHING`,
        [codes, codes.map((c) => newCatalog.get(c))],
      );
    }
    if (writes.length) {
      await tx.query(
        `INSERT INTO "CompanyIndustrySet" ("companyId", source, codes, "sourceUpdatedAt", "createdAt", "updatedAt")
         SELECT v.cid, $1, string_to_array(v.codes, ','), $2::date, now(), now()
         FROM unnest($3::text[], $4::text[]) AS v(cid, codes)
         ON CONFLICT ("companyId", source) DO UPDATE
           SET codes = EXCLUDED.codes, "sourceUpdatedAt" = EXCLUDED."sourceUpdatedAt", "updatedAt" = now()`,
        [prov.source, prov.sourceUpdatedAt, writes.map((w) => w.companyId), writes.map((w) => w.codes.join(","))],
      );
      // Page content changed: bump the meaningful-change timestamp (not only updatedAt).
      await tx.query(`UPDATE "Company" SET "dataUpdatedAt" = now() WHERE id = ANY($1::text[])`, [writes.map((w) => w.companyId)]);
    }
  };
  if (opts.apply) await sql.transaction(work);
  else await work(sql);
}

/** Codes already present in the catalog (loaded once per run). */
export async function loadCatalogCodes(sql: Sql): Promise<Set<string>> {
  const rows = await sql.query<{ code: string }>(`SELECT code FROM "IndustryCatalog"`);
  return new Set(rows.map((r) => r.code));
}
