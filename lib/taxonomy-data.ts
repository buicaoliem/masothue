import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/pipeline/db";
import { listableWhere } from "@/lib/company";
import { legalFormSlug, STATUS_PAGES } from "@/lib/seo/taxonomy";

// Read-side queries behind the taxonomy hubs (province, industry, legal form, status, new companies)
// and statistics. Every query applies the same "listable" rule as the sitemap (lib/company.ts):
// enriched, named, addressed, not hidden, no APPROVED removal request. Nothing is invented: counts
// come straight from the store.

export const LIST_PAGE_SIZE = 50;

/** Hourly cache for whole-table aggregates (homepage, hubs, sitemaps): counts need not be real-time. */
const AGG_REVALIDATE_S = 3600;
function cached<A extends unknown[], R>(key: string, fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return unstable_cache(fn, [`taxonomy:${key}`], { revalidate: AGG_REVALIDATE_S });
}

// Raw-SQL twin of listableWhere() for aggregates Prisma's groupBy cannot express.
const LISTABLE_SQL = Prisma.sql`c."isHidden" = false AND c."enrichStatus" = 'OK' AND c."name" IS NOT NULL AND c."address" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "RemovalRequest" r WHERE r."taxCode" = c."taxCode" AND r.status = 'APPROVED')`;

export type ListedRow = { taxCode: string; name: string; address: string };
const LIST_SELECT = { taxCode: true, name: true, address: true } as const;

export async function listCompanies(extra: Prisma.CompanyWhereInput, page: number) {
  const where = await listableWhere(extra);
  const [total, rows] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { taxCode: "asc" },
      skip: (page - 1) * LIST_PAGE_SIZE,
      take: LIST_PAGE_SIZE,
    }) as Promise<ListedRow[]>,
  ]);
  return { total, rows };
}

export const countCompanies = async (extra: Prisma.CompanyWhereInput = {}) =>
  prisma.company.count({ where: await listableWhere(extra) });

// ---- legal form -------------------------------------------------------------------------

export type LegalFormCount = { slug: string; label: string; total: number };

/** Legal forms present in the data, derived from Company.legalType (free text) and slugged. */
export const listLegalForms = cached("legal-forms", async (min: number = 1): Promise<LegalFormCount[]> => {
  const groups = await prisma.company.groupBy({
    by: ["legalType"],
    where: await listableWhere({ legalType: { not: null } }),
    _count: { _all: true },
  });
  const bySlug = new Map<string, LegalFormCount>();
  for (const g of groups) {
    if (!g.legalType?.trim()) continue;
    const slug = legalFormSlug(g.legalType);
    if (!slug) continue;
    const prev = bySlug.get(slug);
    bySlug.set(slug, { slug, label: prev?.label ?? g.legalType, total: (prev?.total ?? 0) + g._count._all });
  }
  return [...bySlug.values()].filter((f) => f.total >= min).sort((a, b) => b.total - a.total);
});

/** All raw legalType strings that slug to `slug` (spellings may differ in case or spacing). */
export async function legalTypesForSlug(slug: string): Promise<string[]> {
  const groups = await prisma.company.groupBy({ by: ["legalType"], where: { legalType: { not: null } } });
  return groups.map((g) => g.legalType!).filter((t) => legalFormSlug(t) === slug);
}

// ---- new companies ----------------------------------------------------------------------

/** Newest registrations, ordered by the real registration date (activeDate), never by import or update time. */
export async function getNewCompanies(opts: { provinceSlug?: string; limit: number; page?: number }) {
  const where = await listableWhere({
    activeDate: { not: null, lte: new Date() },
    ...(opts.provinceSlug ? { provinceSlug: opts.provinceSlug } : {}),
  });
  const page = opts.page ?? 1;
  const [total, rows] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      select: { ...LIST_SELECT, activeDate: true, provinceSlug: true },
      orderBy: [{ activeDate: "desc" }, { taxCode: "desc" }],
      skip: (page - 1) * opts.limit,
      take: opts.limit,
    }),
  ]);
  return { total, rows: rows as (ListedRow & { activeDate: Date | null; provinceSlug: string | null })[] };
}

// ---- statistics -------------------------------------------------------------------------

export type StatusBreakdown = { total: number; active: number; suspended: number; stopped: number };

/** Status breakdown over listable companies, optionally within one province. */
export const getStatusBreakdown = cached("status-breakdown", async (provinceSlug?: string): Promise<StatusBreakdown> => {
  const scope: Prisma.CompanyWhereInput = provinceSlug ? { provinceSlug } : {};
  const [total, active, suspended, stopped] = await Promise.all([
    countCompanies(scope),
    ...STATUS_PAGES.map((s) => countCompanies({ AND: [scope, s.where] })),
  ]);
  return { total, active, suspended, stopped };
});

const dataAsOfIso = cached("data-as-of", async (): Promise<string | null> => {
  const r = await prisma.company.aggregate({ where: await listableWhere({ dataAsOf: { not: null } }), _max: { dataAsOf: true } });
  return r._max.dataAsOf?.toISOString() ?? null;
});

/** Latest real data-source date (dataAsOf) among listable companies, or null. Never a build timestamp. */
export async function getDataAsOf(): Promise<Date | null> {
  const iso = await dataAsOfIso();
  return iso ? new Date(iso) : null;
}

/** Province slugs with their listable-company counts (any count; callers apply the indexability rule). */
export const listProvinceCounts = cached("province-counts", async (): Promise<{ provinceSlug: string; total: number }[]> => {
  const groups = await prisma.company.groupBy({
    by: ["provinceSlug"],
    where: await listableWhere({ provinceSlug: { not: null } }),
    _count: { _all: true },
  });
  return groups.map((g) => ({ provinceSlug: g.provinceSlug!, total: g._count._all }));
});
