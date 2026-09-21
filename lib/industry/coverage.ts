import type { Sql } from "@/lib/directory/sql";

// Measured data coverage and integrity, shared by the backfill report and `npm run data:quality`.
// "Listable" here is the row-level part of the public rule (enriched, named, addressed, not hidden);
// removal requests are ignored so the numbers stay cheap to compute.

const LISTABLE = `c."isHidden" = false AND c."enrichStatus" = 'OK' AND c.name IS NOT NULL AND c.address IS NOT NULL`;

export type Coverage = {
  totalCompanies: number;
  listable: number;
  validMst: number;
  invalidMst: number;
  duplicateMst: number;
  missingName: number;
  missingProvince: number;
  missingStatus: number;
  missingLegalType: number;
  missingTaxOffice: number;
  withPrimaryIndustry: number;
  withAnyIndustry: number;
  withSecondaryIndustries: number;
  missingPrimaryIndustry: number;
  uniqueIndustries: number;
  catalogSize: number;
  // compact registered-industry sets (HCM)
  companiesWithCompactSet: number;
  compactMemberships: number;
  avgIndustriesPerCompany: number;
  maxIndustriesPerCompany: number;
  registeredWithoutPrimary: number; // expected for HCM, NOT an integrity problem
  // integrity
  unknownIndustryCodes: number;
  duplicateCodesInArrays: number;
  malformedCodesInArrays: number;
  orphanIndustryCodes: number;
  invalidIndustryCodes: number;
  companiesWithMultiplePrimary: number;
  mainIndustryCacheMismatch: number;
};

const n = (v: unknown) => Number(v ?? 0);

export async function measureCoverage(sql: Sql): Promise<Coverage> {
  const [a] = await sql.query<Record<string, unknown>>(`
    SELECT count(*) AS total,
      count(*) FILTER (WHERE ${LISTABLE}) AS listable,
      count(*) FILTER (WHERE "taxCode" ~ '^[0-9]{10}(-[0-9]{3})?$') AS valid_mst,
      count(*) FILTER (WHERE "taxCode" !~ '^[0-9]{10}(-[0-9]{3})?$') AS invalid_mst,
      count(*) FILTER (WHERE ${LISTABLE} AND "provinceSlug" IS NULL) AS no_province,
      count(*) FILTER (WHERE ${LISTABLE} AND status IS NULL) AS no_status,
      count(*) FILTER (WHERE ${LISTABLE} AND "legalType" IS NULL) AS no_legal,
      count(*) FILTER (WHERE ${LISTABLE} AND "taxOffice" IS NULL) AS no_tax_office
    FROM "Company" c`);
  const [b] = await sql.query<Record<string, unknown>>(`
    SELECT count(*) FILTER (WHERE c."isHidden" = false AND c."enrichStatus" = 'OK' AND c.name IS NULL) AS no_name
    FROM "Company" c`);
  const [dup] = await sql.query<Record<string, unknown>>(`SELECT count(*) AS n FROM (SELECT "taxCode" FROM "Company" GROUP BY 1 HAVING count(*) > 1) t`);
  // Both storages, unioned: a company counts once per code however it is stored.
  const [i] = await sql.query<Record<string, unknown>>(`
    WITH mem AS (
      SELECT ci."companyId" AS cid, ci.code, ci."isPrimary" AS prim FROM "CompanyIndustry" ci
      UNION ALL
      SELECT s."companyId", u.code, false FROM "CompanyIndustrySet" s, unnest(s.codes) AS u(code)
    )
    SELECT
      count(DISTINCT mem.cid) FILTER (WHERE mem.prim AND ${LISTABLE}) AS with_primary,
      count(DISTINCT mem.cid) FILTER (WHERE ${LISTABLE}) AS with_any,
      count(DISTINCT mem.cid) FILTER (WHERE NOT mem.prim AND ${LISTABLE}) AS with_secondary,
      count(DISTINCT mem.code) AS unique_codes,
      count(*) FILTER (WHERE mem.code !~ '^[0-9]{2,5}$') AS invalid_codes
    FROM mem JOIN "Company" c ON c.id = mem.cid`);
  const [set] = await sql.query<Record<string, unknown>>(`
    SELECT count(*) AS companies, COALESCE(sum(cardinality(codes)), 0) AS memberships, COALESCE(max(cardinality(codes)), 0) AS max_codes,
           count(*) FILTER (WHERE cardinality(codes) <> (SELECT count(DISTINCT x) FROM unnest(codes) x)) AS dup_arrays,
           count(*) FILTER (WHERE EXISTS (SELECT 1 FROM unnest(codes) x WHERE x !~ '^[0-9]{2,5}$')) AS bad_arrays
    FROM "CompanyIndustrySet"`);
  const [unknown] = await sql.query<Record<string, unknown>>(
    `SELECT count(DISTINCT u.code) AS n FROM "CompanyIndustrySet" s, unnest(s.codes) AS u(code) LEFT JOIN "IndustryCatalog" k ON k.code = u.code WHERE k.code IS NULL`,
  );
  const [noPrimary] = await sql.query<Record<string, unknown>>(`
    WITH mem AS (
      SELECT ci."companyId" AS cid, ci."isPrimary" AS prim FROM "CompanyIndustry" ci
      UNION ALL SELECT s."companyId", false FROM "CompanyIndustrySet" s
    )
    SELECT count(*) AS n FROM (SELECT mem.cid FROM mem JOIN "Company" c ON c.id = mem.cid WHERE ${LISTABLE} GROUP BY mem.cid HAVING NOT bool_or(mem.prim)) t`);
  const [cat] = await sql.query<Record<string, unknown>>(`SELECT count(*) AS n FROM "IndustryCatalog"`);
  const [orphan] = await sql.query<Record<string, unknown>>(
    `SELECT count(DISTINCT ci.code) AS n FROM "CompanyIndustry" ci LEFT JOIN "IndustryCatalog" k ON k.code = ci.code WHERE k.code IS NULL`,
  );
  const [multi] = await sql.query<Record<string, unknown>>(
    `SELECT count(*) AS n FROM (SELECT "companyId" FROM "CompanyIndustry" WHERE "isPrimary" GROUP BY 1 HAVING count(*) > 1) t`,
  );
  const [mismatch] = await sql.query<Record<string, unknown>>(
    `SELECT count(*) AS n FROM "CompanyIndustry" ci JOIN "Company" c ON c.id = ci."companyId"
     WHERE ci."isPrimary" AND c."mainIndustry" IS DISTINCT FROM (ci.code || ' - ' || ci.name)`,
  );

  const listable = n(a.listable);
  return {
    totalCompanies: n(a.total),
    listable,
    validMst: n(a.valid_mst),
    invalidMst: n(a.invalid_mst),
    duplicateMst: n(dup.n),
    missingName: n(b.no_name),
    missingProvince: n(a.no_province),
    missingStatus: n(a.no_status),
    missingLegalType: n(a.no_legal),
    missingTaxOffice: n(a.no_tax_office),
    withPrimaryIndustry: n(i.with_primary),
    withAnyIndustry: n(i.with_any),
    withSecondaryIndustries: n(i.with_secondary),
    missingPrimaryIndustry: listable - n(i.with_primary),
    uniqueIndustries: n(i.unique_codes),
    catalogSize: n(cat.n),
    companiesWithCompactSet: n(set.companies),
    compactMemberships: n(set.memberships),
    avgIndustriesPerCompany: n(set.companies) ? +(n(set.memberships) / n(set.companies)).toFixed(1) : 0,
    maxIndustriesPerCompany: n(set.max_codes),
    registeredWithoutPrimary: n(noPrimary.n),
    unknownIndustryCodes: n(unknown.n),
    duplicateCodesInArrays: n(set.dup_arrays),
    malformedCodesInArrays: n(set.bad_arrays),
    orphanIndustryCodes: n(orphan.n),
    invalidIndustryCodes: n(i.invalid_codes),
    companiesWithMultiplePrimary: n(multi.n),
    mainIndustryCacheMismatch: n(mismatch.n),
  };
}

/** Integrity failures only: nullable fields that are legitimately empty are never errors. */
export function integrityProblems(c: Coverage): string[] {
  const out: string[] = [];
  if (c.invalidMst > 0) out.push(`${c.invalidMst} Company rows with a malformed tax code`);
  if (c.duplicateMst > 0) out.push(`${c.duplicateMst} duplicate tax codes`);
  if (c.companiesWithMultiplePrimary > 0) out.push(`${c.companiesWithMultiplePrimary} companies with more than one primary industry`);
  if (c.invalidIndustryCodes > 0) out.push(`${c.invalidIndustryCodes} CompanyIndustry rows with a malformed industry code`);
  if (c.orphanIndustryCodes > 0) out.push(`${c.orphanIndustryCodes} industry codes missing from IndustryCatalog (run data:backfill-industries --apply)`);
  if (c.mainIndustryCacheMismatch > 0) out.push(`${c.mainIndustryCacheMismatch} companies whose mainIndustry cache differs from the primary CompanyIndustry (run data:backfill-industries --apply)`);
  if (c.unknownIndustryCodes > 0) out.push(`${c.unknownIndustryCodes} codes in CompanyIndustrySet missing from IndustryCatalog`);
  if (c.duplicateCodesInArrays > 0) out.push(`${c.duplicateCodesInArrays} CompanyIndustrySet rows with duplicate codes`);
  if (c.malformedCodesInArrays > 0) out.push(`${c.malformedCodesInArrays} CompanyIndustrySet rows with a malformed code`);
  return out;
}

export const pct = (part: number, whole: number) => (whole === 0 ? "0.0%" : `${((part / whole) * 100).toFixed(1)}%`);
