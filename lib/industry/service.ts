import { cache } from "react";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/pipeline/db";
import { LIST_PAGE_SIZE } from "@/lib/taxonomy-data";

// The ONE place UI and SEO code read industries from. Storage is an implementation detail:
//   - CompanyIndustry     sparse rows with clear semantics (explicit primary, structured secondary lists)
//   - CompanyIndustrySet  compact text[] of registered industries (HCM open data), never a primary
// Results are unioned and de-duplicated by code; a code that is primary anywhere is primary here.
// Names always come from IndustryCatalog. Counts for taxonomy pages come from the derived
// IndustryStat / ProvinceIndustryStat tables (data:rebuild-industry-stats), never from request-time scans.

export type Industry = { code: string; name: string };

export type CompanyIndustries = {
  /** Explicit primary only. null means "unknown", NOT "none": never inferred from a registered list. */
  primary: Industry | null;
  /** Registered industries other than the primary, sorted by code. */
  registered: Industry[];
  /** Distinct data sources that contributed (e.g. "opendata-hcm"). */
  sources: string[];
};

/** Pure union step (also the unit-tested contract): rows from both storages -> primary + registered. */
export function unionIndustries(
  rows: { code: string; name: string; isPrimary: boolean; source: string | null }[],
): CompanyIndustries {
  const byCode = new Map<string, { name: string; isPrimary: boolean }>();
  const sources = new Set<string>();
  for (const r of rows) {
    if (r.source) sources.add(r.source);
    const prev = byCode.get(r.code);
    byCode.set(r.code, { name: prev?.name ?? r.name, isPrimary: (prev?.isPrimary ?? false) || r.isPrimary });
  }
  const all = [...byCode.entries()].map(([code, v]) => ({ code, ...v })).sort((a, b) => a.code.localeCompare(b.code));
  const primary = all.find((x) => x.isPrimary);
  return {
    primary: primary ? { code: primary.code, name: primary.name } : null,
    registered: all.filter((x) => !x.isPrimary).map(({ code, name }) => ({ code, name })),
    sources: [...sources].sort(),
  };
}

/** All industries of one company: one round trip across both storages. */
export async function getCompanyIndustries(taxCode: string): Promise<CompanyIndustries> {
  const rows = await prisma.$queryRaw<{ code: string; name: string; isPrimary: boolean; source: string | null }[]>(Prisma.sql`
    WITH c AS (SELECT id FROM "Company" WHERE "taxCode" = ${taxCode}),
    m AS (
      SELECT ci.code, ci.name, ci."isPrimary", ci.source FROM "CompanyIndustry" ci JOIN c ON c.id = ci."companyId"
      UNION ALL
      SELECT u.code, u.code AS name, false, s.source
      FROM "CompanyIndustrySet" s JOIN c ON c.id = s."companyId", unnest(s.codes) AS u(code)
    )
    SELECT m.code, COALESCE(k.name, m.name) AS name, m."isPrimary", m.source
    FROM m LEFT JOIN "IndustryCatalog" k ON k.code = m.code`);
  return unionIndustries(rows);
}

/** Prisma filter: the company holds `code` in ANY storage (primary, row, or compact set). */
export const industryWhere = (code: string): Prisma.CompanyWhereInput => ({
  OR: [{ industries: { some: { code } } }, { industrySets: { some: { codes: { has: code } } } }],
});

/**
 * Deepest browsable page of an industry list. Measured on the full HCM data: page 1 ~1-250 ms, but an
 * OFFSET of ~10,000 rows costs ~860 ms, so lists stop at 50 pages (2,500 companies); every company stays
 * reachable through its own URL and the company sitemaps.
 */
export const INDUSTRY_LIST_MAX_PAGES = 50;

/**
 * One page of listable companies holding `code` (optionally within a province). `total` comes from the
 * derived stats, so no COUNT runs at request time.
 */
// Raw SQL on purpose: Prisma renders the two-storage OR as `id IN (subquery) OR id IN (subquery)`, which cannot use the
// GIN / (code, companyId) indexes (measured 2.1 s for HCM + a rare code). EXISTS branches plan as index lookups
// (1-25 ms), and the removal exclusion lives in the same statement instead of a separate round trip.
const industryPage = unstable_cache(
  async (code: string, provinceSlug: string | null, page: number) => {
    const province = provinceSlug ? Prisma.sql`AND c."provinceSlug" = ${provinceSlug}` : Prisma.empty;
    return prisma.$queryRaw<{ taxCode: string; name: string; address: string }[]>(Prisma.sql`
      SELECT c."taxCode", c.name, c.address FROM "Company" c
      WHERE c."isHidden" = false AND c."enrichStatus" = 'OK' AND c.name IS NOT NULL AND c.address IS NOT NULL ${province}
        AND NOT EXISTS (SELECT 1 FROM "RemovalRequest" r WHERE r."taxCode" = c."taxCode" AND r.status = 'APPROVED')
        AND (EXISTS (SELECT 1 FROM "CompanyIndustry" ci WHERE ci."companyId" = c.id AND ci.code = ${code})
             OR EXISTS (SELECT 1 FROM "CompanyIndustrySet" s WHERE s."companyId" = c.id AND s.codes @> ARRAY[${code}]::text[]))
      ORDER BY c."taxCode" LIMIT ${LIST_PAGE_SIZE} OFFSET ${(page - 1) * LIST_PAGE_SIZE}`);
  },
  ["industry-page-v2"],
  { revalidate: 3600 }, // hub lists change only when a data import runs
);

export async function getCompaniesByIndustry(code: string, opts: { provinceSlug?: string; page: number }) {
  const stat = opts.provinceSlug ? await getProvinceIndustryStat(opts.provinceSlug, code) : await getIndustryStat(code);
  const total = stat?.companyCount ?? 0;
  if (!total || opts.page > INDUSTRY_LIST_MAX_PAGES) return { total, rows: [] as { taxCode: string; name: string; address: string }[] };
  const rows = await industryPage(code, opts.provinceSlug ?? null, opts.page);
  return { total, rows: rows as { taxCode: string; name: string; address: string }[] };
}

// ---- derived statistics -------------------------------------------------------------------------------

export type IndustryStatRow = {
  code: string;
  name: string;
  companyCount: number;
  primaryCount: number;
  registeredCount: number;
  provinceCount: number;
  sourceCount: number;
};

export type ProvinceIndustryStatRow = {
  provinceSlug: string;
  code: string;
  name: string;
  companyCount: number;
  primaryCount: number;
  registeredCount: number;
  provinceCompanyCount: number;
  provinceIndustryCompanyCount: number;
  saturationRatio: number;
  sourceCount: number;
};

// React cache(): generateMetadata() and the page ask for the same stat in one request; it is queried once.
export const getIndustryStat = cache(async (code: string): Promise<IndustryStatRow | null> => {
  const rows = await prisma.$queryRaw<IndustryStatRow[]>(Prisma.sql`
    SELECT s.code, k.name, s."companyCount", s."primaryCount", s."registeredCount", s."provinceCount", s."sourceCount"
    FROM "IndustryStat" s JOIN "IndustryCatalog" k ON k.code = s.code WHERE s.code = ${code}`);
  return rows[0] ?? null;
});

export async function listIndustryStats(): Promise<IndustryStatRow[]> {
  return prisma.$queryRaw<IndustryStatRow[]>(Prisma.sql`
    SELECT s.code, k.name, s."companyCount", s."primaryCount", s."registeredCount", s."provinceCount", s."sourceCount"
    FROM "IndustryStat" s JOIN "IndustryCatalog" k ON k.code = s.code
    ORDER BY s."companyCount" DESC, s.code`);
}

const PROVINCE_STAT_SELECT = Prisma.sql`
  SELECT p."provinceSlug", p.code, k.name, p."companyCount", p."primaryCount", p."registeredCount", p."provinceCompanyCount",
         p."provinceIndustryCompanyCount", p."saturationRatio", p."sourceCount"
  FROM "ProvinceIndustryStat" p JOIN "IndustryCatalog" k ON k.code = p.code`;

export const getProvinceIndustryStat = cache(async (provinceSlug: string, code: string): Promise<ProvinceIndustryStatRow | null> => {
  const rows = await prisma.$queryRaw<ProvinceIndustryStatRow[]>(
    Prisma.sql`${PROVINCE_STAT_SELECT} WHERE p."provinceSlug" = ${provinceSlug} AND p.code = ${code}`,
  );
  return rows[0] ?? null;
});

/** Stat rows of one industry across provinces (largest first): one query instead of one per province. */
export async function listProvinceStatsForIndustry(code: string, limit = 12): Promise<ProvinceIndustryStatRow[]> {
  return prisma.$queryRaw<ProvinceIndustryStatRow[]>(
    Prisma.sql`${PROVINCE_STAT_SELECT} WHERE p.code = ${code} ORDER BY p."companyCount" DESC, p."provinceSlug" LIMIT ${limit}`,
  );
}

/** Every province x industry stat row (24k at most): sitemap and reports evaluate them with the SEO quality rule. */
export async function listProvinceIndustryStats(provinceSlug?: string): Promise<ProvinceIndustryStatRow[]> {
  return prisma.$queryRaw<ProvinceIndustryStatRow[]>(
    provinceSlug
      ? Prisma.sql`${PROVINCE_STAT_SELECT} WHERE p."provinceSlug" = ${provinceSlug} ORDER BY p."companyCount" DESC, p.code`
      : Prisma.sql`${PROVINCE_STAT_SELECT} ORDER BY p."provinceSlug", p.code`,
  );
}

/** Where an industry's companies are, by province. */
export async function getIndustryProvinceDistribution(code: string, limit = 12) {
  const rows = await prisma.$queryRaw<{ provinceSlug: string; companyCount: number }[]>(Prisma.sql`
    SELECT "provinceSlug", "companyCount" FROM "ProvinceIndustryStat" WHERE code = ${code}
    ORDER BY "companyCount" DESC, "provinceSlug" LIMIT ${limit}`);
  return rows;
}

/** Sibling industries sharing the first three digits (same VSIC group): a real hierarchy relation. */
export async function getRelatedIndustries(code: string, limit = 8): Promise<IndustryStatRow[]> {
  if (code.length < 4) return [];
  const prefix = `${code.slice(0, 3)}%`;
  return prisma.$queryRaw<IndustryStatRow[]>(Prisma.sql`
    SELECT s.code, k.name, s."companyCount", s."primaryCount", s."registeredCount", s."provinceCount", s."sourceCount"
    FROM "IndustryStat" s JOIN "IndustryCatalog" k ON k.code = s.code
    WHERE s.code LIKE ${prefix} AND s.code <> ${code}
    ORDER BY s."companyCount" DESC LIMIT ${limit}`);
}

/** Companies with any industry data, nationally: the denominator of national saturation. */
export const getIndustryContext = cache(async (): Promise<{ companiesWithIndustry: number }> => {
  const rows = await prisma.$queryRaw<{ n: bigint | null }[]>(Prisma.sql`
    SELECT sum(v) AS n FROM (SELECT DISTINCT ON ("provinceSlug") "provinceIndustryCompanyCount" AS v FROM "ProvinceIndustryStat" ORDER BY "provinceSlug") t`);
  return { companiesWithIndustry: Number(rows[0]?.n ?? 0) };
});
