import { prisma } from "@/pipeline/db";
import { INDEXABLE_MIN_PROFILES, type PublicProfile } from "@/lib/directory";
import { prismaSql, type Sql } from "@/lib/directory/sql";
import { ACTIVE_STATUS_SUBSTRING } from "@/lib/company-status";

// Public reads for the /danh-ba pages that don't fit lib/directory/service.ts's per group×province
// API: cross-group/cross-province rollups, a status/completeness filter, and "same group" lookups.
// Built directly on Company + business_profile, mirroring the same "not blocked" (hidden or
// pending/approved takedown) rule documented in lib/directory/service.ts. Public reads only:
// never select submitter columns.
//
// Runs through the same injectable Sql interface as lib/directory/service.ts so tests can swap in
// PGlite; `directoryWeb` below is the app's prisma-bound instance, and its functions are re-exported
// individually so existing callers don't need to change.

export const DIRECTORY_PAGE_SIZE = 20;

export type ProfileFilter = "active" | "all" | "complete";

/** "Đang hoạt động" (default) matches Company.status; "Có hồ sơ đầy đủ" needs a description and a public contact. */
function filterClause(filter: ProfileFilter): string {
  if (filter === "active") return `AND c.status ILIKE '%${ACTIVE_STATUS_SUBSTRING}%'`;
  if (filter === "complete") {
    return `AND length(trim(p.description)) > 0
      AND (p.public_phone IS NOT NULL OR p.public_zalo IS NOT NULL OR p.website IS NOT NULL OR p.public_email IS NOT NULL)`;
  }
  return "";
}

export function createDirectoryWeb(sql: Sql) {
  const NOT_BLOCKED = `
    NOT EXISTS (SELECT 1 FROM "Company" c WHERE c."taxCode" = p.mst AND c."isHidden")
    AND NOT EXISTS (SELECT 1 FROM "RemovalRequest" r WHERE r."taxCode" = p.mst AND r.status IN ('PENDING', 'APPROVED'))`;

  const PROFILE_COLUMNS = `
    p.mst, p.company_name AS "companyName", p.address, p.province_slug AS "provinceSlug",
    p.group_slug AS "groupSlug", p.description, p.services, p.public_phone AS "publicPhone",
    p.public_zalo AS "publicZalo", p.website, p.public_email AS "publicEmail", p.logo_url AS "logoUrl",
    p.approved_at AS "approvedAt", p.updated_at AS "updatedAt"`;

  async function listProfilesFiltered(groupSlug: string, provinceSlug: string, page: number, filter: ProfileFilter): Promise<PublicProfile[]> {
    const p = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    return sql.query<PublicProfile>(
      `SELECT ${PROFILE_COLUMNS} FROM business_profile p
       LEFT JOIN "Company" c ON c."taxCode" = p.mst
       WHERE p.group_slug = $1 AND p.province_slug = $2 AND ${NOT_BLOCKED} ${filterClause(filter)}
       ORDER BY p.approved_at DESC, p.mst
       LIMIT $3 OFFSET $4`,
      [groupSlug, provinceSlug, DIRECTORY_PAGE_SIZE, (p - 1) * DIRECTORY_PAGE_SIZE],
    );
  }

  async function countProfilesFiltered(groupSlug: string, provinceSlug: string, filter: ProfileFilter): Promise<number> {
    const rows = await sql.query<{ n: bigint | number }>(
      `SELECT count(*) AS n FROM business_profile p
       LEFT JOIN "Company" c ON c."taxCode" = p.mst
       WHERE p.group_slug = $1 AND p.province_slug = $2 AND ${NOT_BLOCKED} ${filterClause(filter)}`,
      [groupSlug, provinceSlug],
    );
    return Number(rows[0]?.n ?? 0);
  }

  /** Approved-profile count per group, across every province (for the /danh-ba group grid). */
  async function getGroupCountsNationwide(): Promise<Map<string, number>> {
    const rows = await sql.query<{ groupSlug: string; n: bigint | number }>(
      `SELECT p.group_slug AS "groupSlug", count(*) AS n FROM business_profile p
       WHERE ${NOT_BLOCKED} GROUP BY p.group_slug`,
    );
    return new Map(rows.map((r) => [r.groupSlug, Number(r.n)]));
  }

  /** Province slugs with at least one approved profile in any group (for the /danh-ba province chips). */
  async function getProvinceSlugsWithAnyProfile(): Promise<string[]> {
    const rows = await sql.query<{ provinceSlug: string }>(
      `SELECT DISTINCT p.province_slug AS "provinceSlug" FROM business_profile p WHERE ${NOT_BLOCKED}`,
    );
    return rows.map((r) => r.provinceSlug);
  }

  /** Group slugs with at least one approved profile in this province. */
  async function getGroupSlugsForProvince(provinceSlug: string): Promise<string[]> {
    const rows = await sql.query<{ groupSlug: string }>(
      `SELECT DISTINCT p.group_slug AS "groupSlug" FROM business_profile p
       WHERE p.province_slug = $1 AND ${NOT_BLOCKED}`,
      [provinceSlug],
    );
    return rows.map((r) => r.groupSlug);
  }

  /** Approved-profile count per group within this province. */
  async function getGroupCountsForProvince(provinceSlug: string): Promise<Map<string, number>> {
    const rows = await sql.query<{ groupSlug: string; n: bigint | number }>(
      `SELECT p.group_slug AS "groupSlug", count(*) AS n FROM business_profile p
       WHERE p.province_slug = $1 AND ${NOT_BLOCKED} GROUP BY p.group_slug`,
      [provinceSlug],
    );
    return new Map(rows.map((r) => [r.groupSlug, Number(r.n)]));
  }

  /** Province slugs with at least one approved profile in this group. */
  async function getProvinceSlugsForGroup(groupSlug: string): Promise<string[]> {
    const rows = await sql.query<{ provinceSlug: string }>(
      `SELECT DISTINCT p.province_slug AS "provinceSlug" FROM business_profile p
       WHERE p.group_slug = $1 AND ${NOT_BLOCKED}`,
      [groupSlug],
    );
    return rows.map((r) => r.provinceSlug);
  }

  /** Approved-profile count per province within this group (for the /danh-ba/[group] page). */
  async function getProvinceCountsForGroup(groupSlug: string): Promise<Map<string, number>> {
    const rows = await sql.query<{ provinceSlug: string; n: bigint | number }>(
      `SELECT p.province_slug AS "provinceSlug", count(*) AS n FROM business_profile p
       WHERE p.group_slug = $1 AND ${NOT_BLOCKED} GROUP BY p.province_slug`,
      [groupSlug],
    );
    return new Map(rows.map((r) => [r.provinceSlug, Number(r.n)]));
  }

  /** Up to `limit` other approved profiles in the same group × province, for "Doanh nghiệp cùng ngành". */
  async function getSameGroupProfiles(groupSlug: string, provinceSlug: string, excludeMst: string, limit = 6): Promise<PublicProfile[]> {
    return sql.query<PublicProfile>(
      `SELECT ${PROFILE_COLUMNS} FROM business_profile p
       WHERE p.group_slug = $1 AND p.province_slug = $2 AND p.mst <> $3 AND ${NOT_BLOCKED}
       ORDER BY p.approved_at DESC, p.mst
       LIMIT $4`,
      [groupSlug, provinceSlug, excludeMst, limit],
    );
  }

  /** Every group × province combo with at least one approved profile (for the sitemap). */
  async function getIndexableDirectoryPaths(): Promise<{ groupSlug: string; provinceSlug: string }[]> {
    return sql.query<{ groupSlug: string; provinceSlug: string }>(
      `SELECT p.group_slug AS "groupSlug", p.province_slug AS "provinceSlug", count(*) AS n
       FROM business_profile p WHERE ${NOT_BLOCKED}
       GROUP BY p.group_slug, p.province_slug
       HAVING count(*) >= ${INDEXABLE_MIN_PROFILES}`,
    );
  }

  return {
    listProfilesFiltered,
    countProfilesFiltered,
    getGroupCountsNationwide,
    getProvinceSlugsWithAnyProfile,
    getGroupSlugsForProvince,
    getGroupCountsForProvince,
    getProvinceSlugsForGroup,
    getProvinceCountsForGroup,
    getSameGroupProfiles,
    getIndexableDirectoryPaths,
  };
}

export const directoryWeb = createDirectoryWeb(prismaSql(prisma));

export const {
  listProfilesFiltered,
  countProfilesFiltered,
  getGroupCountsNationwide,
  getProvinceSlugsWithAnyProfile,
  getGroupSlugsForProvince,
  getGroupCountsForProvince,
  getProvinceSlugsForGroup,
  getProvinceCountsForGroup,
  getSameGroupProfiles,
  getIndexableDirectoryPaths,
} = directoryWeb;
