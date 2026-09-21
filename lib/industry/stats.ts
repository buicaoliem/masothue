import type { Sql } from "@/lib/directory/sql";

// Derived aggregates behind the industry taxonomy (IndustryStat, ProvinceIndustryStat).
// Source of truth = CompanyIndustry + CompanyIndustrySet over LISTABLE companies; this recomputes and
// upserts, then removes rows this run no longer produced. Deterministic and idempotent: same data in,
// same rows out (only updatedAt moves). Runs in one transaction so readers never see a half-built state.

const LISTABLE = `c."isHidden" = false AND c."enrichStatus" = 'OK' AND c.name IS NOT NULL AND c.address IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "RemovalRequest" r WHERE r."taxCode" = c."taxCode" AND r.status = 'APPROVED')`;

// Memberships from BOTH storages, restricted to listable companies and to codes present in the catalog
// (an orphan code never becomes a page).
const MEMBERSHIPS = `
  mem AS (
    SELECT ci."companyId" AS cid, ci.code, ci."isPrimary" AS prim, COALESCE(ci.source, 'unknown') AS src FROM "CompanyIndustry" ci
    UNION ALL
    SELECT s."companyId", u.code, false, s.source FROM "CompanyIndustrySet" s, unnest(s.codes) AS u(code)
  ),
  lc AS (SELECT c.id, c."provinceSlug" AS prov FROM "Company" c WHERE ${LISTABLE}),
  m AS (
    SELECT mem.cid, mem.code, mem.prim, mem.src, lc.prov
    FROM mem JOIN lc ON lc.id = mem.cid JOIN "IndustryCatalog" k ON k.code = mem.code
  )`;

export type StatsRebuild = {
  industryRows: number;
  provinceIndustryRows: number;
  staleIndustryRows: number;
  staleProvinceIndustryRows: number;
};

const n = (v: unknown) => Number(v ?? 0);

export async function rebuildIndustryStats(sql: Sql, opts: { apply: boolean; now?: Date } = { apply: true }): Promise<StatsRebuild> {
  const runAt = (opts.now ?? new Date()).toISOString();

  const industrySelect = `
    WITH ${MEMBERSHIPS}
    SELECT code,
           count(DISTINCT cid)::int AS company_count,
           count(DISTINCT cid) FILTER (WHERE prim)::int AS primary_count,
           count(DISTINCT prov)::int AS province_count,
           count(DISTINCT src)::int AS source_count
    FROM m GROUP BY code`;

  const provinceSelect = `
    WITH ${MEMBERSHIPS},
    pc AS (SELECT prov, count(*)::int AS listable FROM lc WHERE prov IS NOT NULL GROUP BY prov),
    pi AS (SELECT prov, count(DISTINCT cid)::int AS with_industry FROM m WHERE prov IS NOT NULL GROUP BY prov)
    SELECT m.prov, m.code,
           count(DISTINCT m.cid)::int AS company_count,
           count(DISTINCT m.cid) FILTER (WHERE m.prim)::int AS primary_count,
           count(DISTINCT m.src)::int AS source_count,
           pc.listable, pi.with_industry
    FROM m JOIN pc ON pc.prov = m.prov JOIN pi ON pi.prov = m.prov
    WHERE m.prov IS NOT NULL
    GROUP BY m.prov, m.code, pc.listable, pi.with_industry`;

  const run = async (tx: Sql): Promise<StatsRebuild> => {
    const ind = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM (${industrySelect}) t`);
    const prov = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM (${provinceSelect}) t`);
    if (!opts.apply) {
      const staleI = await tx.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM "IndustryStat" s WHERE s.code NOT IN (SELECT code FROM (${industrySelect}) t)`,
      );
      const staleP = await tx.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM "ProvinceIndustryStat" s
         WHERE NOT EXISTS (SELECT 1 FROM (${provinceSelect}) t WHERE t.prov = s."provinceSlug" AND t.code = s.code)`,
      );
      return { industryRows: n(ind[0].n), provinceIndustryRows: n(prov[0].n), staleIndustryRows: n(staleI[0].n), staleProvinceIndustryRows: n(staleP[0].n) };
    }

    await tx.query(
      `INSERT INTO "IndustryStat" (code, "companyCount", "primaryCount", "registeredCount", "provinceCount", "sourceCount", "updatedAt")
       SELECT code, company_count, primary_count, company_count - primary_count, province_count, source_count, $1::timestamp
       FROM (${industrySelect}) t
       ON CONFLICT (code) DO UPDATE SET
         "companyCount" = EXCLUDED."companyCount", "primaryCount" = EXCLUDED."primaryCount",
         "registeredCount" = EXCLUDED."registeredCount", "provinceCount" = EXCLUDED."provinceCount",
         "sourceCount" = EXCLUDED."sourceCount", "updatedAt" = EXCLUDED."updatedAt"`,
      [runAt],
    );
    const staleI = await tx.query<{ code: string }>(`DELETE FROM "IndustryStat" WHERE "updatedAt" <> $1::timestamp RETURNING code`, [runAt]);

    await tx.query(
      `INSERT INTO "ProvinceIndustryStat" ("provinceSlug", code, "companyCount", "primaryCount", "registeredCount", "provinceCompanyCount",
                                          "provinceIndustryCompanyCount", "saturationRatio", "sourceCount", "updatedAt")
       SELECT prov, code, company_count, primary_count, company_count - primary_count, listable, with_industry,
              company_count::float8 / with_industry, source_count, $1::timestamp
       FROM (${provinceSelect}) t
       ON CONFLICT ("provinceSlug", code) DO UPDATE SET
         "companyCount" = EXCLUDED."companyCount", "primaryCount" = EXCLUDED."primaryCount",
         "registeredCount" = EXCLUDED."registeredCount", "provinceCompanyCount" = EXCLUDED."provinceCompanyCount",
         "provinceIndustryCompanyCount" = EXCLUDED."provinceIndustryCompanyCount", "saturationRatio" = EXCLUDED."saturationRatio",
         "sourceCount" = EXCLUDED."sourceCount", "updatedAt" = EXCLUDED."updatedAt"`,
      [runAt],
    );
    const staleP = await tx.query<{ code: string }>(`DELETE FROM "ProvinceIndustryStat" WHERE "updatedAt" <> $1::timestamp RETURNING code`, [runAt]);
    return { industryRows: n(ind[0].n), provinceIndustryRows: n(prov[0].n), staleIndustryRows: staleI.length, staleProvinceIndustryRows: staleP.length };
  };

  return opts.apply ? sql.transaction(run) : run(sql);
}
