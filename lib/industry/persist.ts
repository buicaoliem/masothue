import type { Sql } from "@/lib/directory/sql";
import { formatMainIndustry, parseLegacyMainIndustry, type IndustryEntry } from "./normalize";

// Persist stage for industries. All SQL goes through the small Sql interface so the same code runs
// against Prisma in production and PGlite (real migrations) in tests.
//
// Source of truth: "CompanyIndustry". "Company.mainIndustry" is a display cache of the primary row.
// Semantics: rows are only ever ADDED. A missing field never deletes anything, an existing primary is
// never replaced by a different incoming one (the incoming one is stored as a non-primary industry and
// counted as a conflict), and hidden / removal-requested companies are never touched.

export type IndustryInput = {
  taxCode: string;
  primary: IndustryEntry | null;
  others: IndustryEntry[];
  /** Overrides the batch provenance (used when one batch mixes sources, e.g. the legacy backfill). */
  prov?: IndustryProvenance;
};

export type IndustryProvenance = { source: string; sourceUpdatedAt: string | null };

export type IndustryStats = {
  seen: number;
  companyNotFound: number;
  skippedHiddenOrRemoval: number;
  skippedNotListable: number;
  companiesTouched: number;
  primaryInserted: number;
  otherInserted: number;
  primaryConflicts: number;
  mainIndustryCacheFilled: number;
};

export const emptyIndustryStats = (): IndustryStats => ({
  seen: 0, companyNotFound: 0, skippedHiddenOrRemoval: 0, skippedNotListable: 0, companiesTouched: 0,
  primaryInserted: 0, otherInserted: 0, primaryConflicts: 0, mainIndustryCacheFilled: 0,
});

type CompanyRow = { id: string; taxCode: string; mainIndustry: string | null; isHidden: boolean; enrichStatus: string; removal: boolean };
type ExistingRow = { companyId: string; code: string; isPrimary: boolean };

type Insert = { companyId: string; code: string; name: string; isPrimary: boolean; prov: IndustryProvenance };

/** Pure planning step: what rows to add for one company, given what it already has. */
export function planCompanyIndustries(
  input: IndustryInput,
  company: { mainIndustry: string | null },
  existing: { code: string; isPrimary: boolean }[],
): { inserts: { code: string; name: string; isPrimary: boolean }[]; conflict: boolean; cacheToFill: string | null } {
  const have = new Set(existing.map((e) => e.code));
  const primaryRow = existing.find((e) => e.isPrimary)?.code ?? null;
  // Company.mainIndustry is only a cache, but before the legacy backfill it is the only record of the primary.
  const legacy = primaryRow ? null : (parseLegacyMainIndustry(company.mainIndustry)?.code ?? null);
  const knownPrimary = primaryRow ?? legacy;
  const inserts: { code: string; name: string; isPrimary: boolean }[] = [];
  let conflict = false;
  let cacheToFill: string | null = null;

  if (input.primary && !have.has(input.primary.code)) {
    if (knownPrimary === null || (primaryRow === null && knownPrimary === input.primary.code)) {
      inserts.push({ ...input.primary, isPrimary: true });
      if (!company.mainIndustry) cacheToFill = formatMainIndustry(input.primary);
    } else if (knownPrimary !== input.primary.code) {
      // A different primary is already on record: keep it, store the incoming one as a plain industry.
      inserts.push({ ...input.primary, isPrimary: false });
      conflict = true;
    }
    have.add(input.primary.code);
  }
  for (const o of input.others) {
    if (have.has(o.code) || o.code === knownPrimary) continue;
    inserts.push({ ...o, isPrimary: false });
    have.add(o.code);
  }
  return { inserts, conflict, cacheToFill };
}

export async function persistIndustries(
  sql: Sql,
  inputs: readonly IndustryInput[],
  prov: IndustryProvenance,
  opts: { apply: boolean; stats: IndustryStats },
): Promise<void> {
  const { stats } = opts;
  // Duplicate taxCode inside one batch: merge, first primary wins.
  const merged = new Map<string, IndustryInput>();
  for (const i of inputs) {
    stats.seen++;
    const prev = merged.get(i.taxCode);
    if (!prev) merged.set(i.taxCode, { ...i, others: [...i.others] });
    else {
      prev.primary ??= i.primary;
      prev.others.push(...i.others);
    }
  }
  if (merged.size === 0) return;

  const work = async (tx: Sql) => {
    const taxCodes = [...merged.keys()];
    const companies = await tx.query<CompanyRow>(
      `SELECT c.id, c."taxCode", c."mainIndustry", c."isHidden", c."enrichStatus"::text AS "enrichStatus",
              EXISTS (SELECT 1 FROM "RemovalRequest" r WHERE r."taxCode" = c."taxCode") AS removal
       FROM "Company" c WHERE c."taxCode" = ANY($1::text[])`,
      [taxCodes],
    );
    const byTax = new Map(companies.map((c) => [c.taxCode, c]));
    const existing = companies.length
      ? await tx.query<ExistingRow>(
          `SELECT "companyId", code, "isPrimary" FROM "CompanyIndustry" WHERE "companyId" = ANY($1::text[])`,
          [companies.map((c) => c.id)],
        )
      : [];
    const existingBy = new Map<string, ExistingRow[]>();
    for (const e of existing) (existingBy.get(e.companyId) ?? existingBy.set(e.companyId, []).get(e.companyId)!).push(e);

    const inserts: Insert[] = [];
    const cache: { companyId: string; value: string }[] = [];
    const touched = new Set<string>();
    for (const input of merged.values()) {
      const c = byTax.get(input.taxCode);
      if (!c) {
        stats.companyNotFound++;
        continue;
      }
      if (c.isHidden || c.removal) {
        stats.skippedHiddenOrRemoval++;
        continue;
      }
      // Rows are kept proportional to listable companies; a PENDING company gets its industries on a later run.
      if (c.enrichStatus !== "OK") {
        stats.skippedNotListable++;
        continue;
      }
      const plan = planCompanyIndustries(input, c, existingBy.get(c.id) ?? []);
      if (plan.conflict) stats.primaryConflicts++;
      for (const ins of plan.inserts) {
        inserts.push({ companyId: c.id, ...ins, prov: input.prov ?? prov });
        touched.add(c.id);
        if (ins.isPrimary) stats.primaryInserted++;
        else stats.otherInserted++;
      }
      if (plan.cacheToFill) {
        cache.push({ companyId: c.id, value: plan.cacheToFill });
        stats.mainIndustryCacheFilled++;
      }
    }
    stats.companiesTouched += touched.size;
    if (!opts.apply || inserts.length === 0) return;

    await tx.query(
      `INSERT INTO "CompanyIndustry" (id, "companyId", code, name, "isPrimary", source, "sourceUpdatedAt", "createdAt", "updatedAt")
       SELECT gen_random_uuid()::text, v.cid, v.code, v.name, v.prim, v.src, v.srcdate::date, now(), now()
       FROM unnest($1::text[], $2::text[], $3::text[], $4::boolean[], $5::text[], $6::text[]) AS v(cid, code, name, prim, src, srcdate)
       ON CONFLICT ("companyId", code) DO NOTHING`,
      [inserts.map((i) => i.companyId), inserts.map((i) => i.code), inserts.map((i) => i.name), inserts.map((i) => i.isPrimary), inserts.map((i) => i.prov.source), inserts.map((i) => i.prov.sourceUpdatedAt)],
    );
    // Page content changed for these companies: bump the meaningful-change timestamp, not just updatedAt.
    await tx.query(`UPDATE "Company" SET "dataUpdatedAt" = now() WHERE id = ANY($1::text[])`, [[...touched]]);
    if (cache.length) {
      await tx.query(
        `UPDATE "Company" c SET "mainIndustry" = v.val
         FROM unnest($1::text[], $2::text[]) AS v(cid, val)
         WHERE c.id = v.cid AND c."mainIndustry" IS NULL`,
        [cache.map((x) => x.companyId), cache.map((x) => x.value)],
      );
    }
  };
  if (opts.apply) await sql.transaction(work);
  else await work(sql);
}

// ---- catalog + reconciliation -------------------------------------------------------------------

/**
 * Adds every observed code to IndustryCatalog (canonical name = the most frequent spelling). Existing
 * catalog names are kept so slugs stay stable; parentCode is set when the code minus its last digit exists.
 */
export async function rebuildIndustryCatalog(sql: Sql): Promise<{ added: number; total: number }> {
  const added = await sql.query<{ code: string }>(
    `INSERT INTO "IndustryCatalog" (code, name, level, source, "createdAt", "updatedAt")
     SELECT DISTINCT ON (code) code, name, length(code), 'observed-in-source-data', now(), now()
     FROM (SELECT code, name, count(*) AS n FROM "CompanyIndustry" GROUP BY code, name) t
     ORDER BY code, n DESC, name
     ON CONFLICT (code) DO NOTHING
     RETURNING code`,
  );
  await sql.query(
    `UPDATE "IndustryCatalog" c SET "parentCode" = left(c.code, length(c.code) - 1)
     WHERE length(c.code) > 2 AND "parentCode" IS NULL
       AND EXISTS (SELECT 1 FROM "IndustryCatalog" p WHERE p.code = left(c.code, length(c.code) - 1))`,
  );
  const total = await sql.query<{ n: bigint | number }>(`SELECT count(*) AS n FROM "IndustryCatalog"`);
  return { added: added.length, total: Number(total[0]?.n ?? 0) };
}

/**
 * Makes Company.mainIndustry agree with the primary CompanyIndustry row (the source of truth).
 * Returns how many rows were rewritten; companies without a primary row are not touched.
 */
export async function reconcileMainIndustry(sql: Sql): Promise<number> {
  const rows = await sql.query<{ id: string }>(
    `UPDATE "Company" c SET "mainIndustry" = ci.code || ' - ' || ci.name
     FROM "CompanyIndustry" ci
     WHERE ci."companyId" = c.id AND ci."isPrimary"
       AND c."mainIndustry" IS DISTINCT FROM (ci.code || ' - ' || ci.name)
     RETURNING c.id`,
  );
  return rows.length;
}
