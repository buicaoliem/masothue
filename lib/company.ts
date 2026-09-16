import { cache } from "react";
import { prisma } from "@/pipeline/db";
import { ensureEnriched } from "@/lib/enrich";

// Only public business fields leave this module. No phone/email/personal IDs.
const PUBLIC_SELECT = {
  taxCode: true,
  name: true,
  address: true,
  province: true,
  provinceSlug: true,
  status: true,
  activeDate: true,
  representativeName: true,
  mainIndustry: true,
  enrichStatus: true,
  isHidden: true,
} as const;

// 10 digits, optionally a 3-digit branch suffix (0100111948-001).
export const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;

// Rows worth linking to or listing: enriched, not hidden, with at least a name and an address.
// Sitemap, province hubs, "nearby" and search all filter through this.
export const LISTABLE = {
  isHidden: false,
  enrichStatus: "OK",
  name: { not: null },
  address: { not: null },
} as const;

type ListedCompany = { taxCode: string; name: string; address: string };

export class EnrichUnavailableError extends Error {}

type PublicCompany = NonNullable<Awaited<ReturnType<typeof findCompany>>>;
type ShowableCompany = PublicCompany & { name: string; address: string };

function findCompany(taxCode: string) {
  return prisma.company.findUnique({ where: { taxCode }, select: PUBLIC_SELECT });
}

/** A page is only worth rendering when not hidden and with at least a name and an address. */
function showable(c: PublicCompany | null): ShowableCompany | null {
  return c && !c.isHidden && c.name && c.address ? (c as ShowableCompany) : null;
}

/** Name for the removal-request form; store only (no enrichment), hidden rows stay unnamed. */
export async function getCompanyNameForRequest(taxCode: string): Promise<string | null> {
  if (!TAX_CODE_RE.test(taxCode)) return null;
  const c = await prisma.company.findUnique({ where: { taxCode }, select: { name: true, isHidden: true } });
  return c && !c.isHidden ? c.name : null;
}

/** Official name/address for prefilling the directory submission form; store only, hidden rows read as not found. */
export async function getCompanyForPrefill(taxCode: string): Promise<{ name: string; address: string } | null> {
  if (!TAX_CODE_RE.test(taxCode)) return null;
  const c = await prisma.company.findUnique({ where: { taxCode }, select: { name: true, address: true, isHidden: true } });
  return c && !c.isHidden && c.name && c.address ? { name: c.name, address: c.address } : null;
}

/** Like getCompanyForPrefill, but never throws — a DB failure resolves to null so the update-profile page renders an empty form instead of crashing. */
export async function getCompanyForPrefillSafe(taxCode: string): Promise<{ name: string; address: string } | null> {
  try {
    return await getCompanyForPrefill(taxCode);
  } catch {
    return null;
  }
}

export type MstLookupInfo = { name: string | null; enrichStatus: "PENDING" | "OK" | "SOURCE_MISS" };

/** Existence check for the "kiểm tra mã số thuế" tool; store only, no enrichment triggered. Hidden rows read as not found. */
export async function findCompanyForLookup(taxCode: string): Promise<MstLookupInfo | null> {
  if (!TAX_CODE_RE.test(taxCode)) return null;
  const c = await prisma.company.findUnique({ where: { taxCode }, select: { name: true, isHidden: true, enrichStatus: true } });
  return c && !c.isHidden ? { name: c.name, enrichStatus: c.enrichStatus } : null;
}

/**
 * Read a company by tax code; null means "render 404".
 * PENDING rows are enriched once (see lib/enrich.ts); the middleware normally does this first
 * and answers 503 when enrichment is unavailable. If it still fails here, EnrichUnavailableError is thrown.
 */
export const getCompany = cache(async (taxCode: string): Promise<ShowableCompany | null> => {
  if (!TAX_CODE_RE.test(taxCode)) return null;
  if ((await ensureEnriched(taxCode)) === "unavailable") throw new EnrichUnavailableError(taxCode);
  const company = await findCompany(taxCode);
  if (company?.enrichStatus === "PENDING" && !company.isHidden) throw new EnrichUnavailableError(taxCode);
  return showable(company);
});

/**
 * Like getCompany, but never throws — null on unavailable enrichment or a non-showable row.
 * For pages that have a fallback (an approved directory profile) when the registry has nothing.
 */
export async function getCompanySafe(taxCode: string): Promise<ShowableCompany | null> {
  try {
    return await getCompany(taxCode);
  } catch {
    return null;
  }
}

/** Up to `limit` other enriched companies in the same province, for the "nearby" block. */
export async function getNearbyCompanies(provinceSlug: string | null, excludeTaxCode: string, limit = 5) {
  if (!provinceSlug) return [];
  return prisma.company.findMany({
    where: { ...LISTABLE, provinceSlug, taxCode: { not: excludeTaxCode } },
    select: { taxCode: true, name: true, address: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  }) as Promise<ListedCompany[]>;
}

export const PROVINCE_PAGE_SIZE = 50;

/** One page (1-based) of listable companies in a province, plus the total count. */
export async function getProvinceCompanies(provinceSlug: string, page: number) {
  const where = { ...LISTABLE, provinceSlug };
  const [total, rows] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      select: { taxCode: true, name: true, address: true },
      orderBy: { taxCode: "asc" },
      skip: (page - 1) * PROVINCE_PAGE_SIZE,
      take: PROVINCE_PAGE_SIZE,
    }) as Promise<ListedCompany[]>,
  ]);
  return { total, rows };
}

/** Slugs of provinces with at least one listable company. */
export async function getListedProvinceSlugs(): Promise<string[]> {
  const groups = await prisma.company.groupBy({
    by: ["provinceSlug"],
    where: { ...LISTABLE, provinceSlug: { not: null } },
  });
  return groups.map((g) => g.provinceSlug!);
}

export const SEARCH_LIMIT = 50;

/** Case-insensitive name match over listable companies only. */
export function searchCompaniesByName(query: string) {
  return prisma.company.findMany({
    where: { ...LISTABLE, name: { contains: query, mode: "insensitive" } },
    select: { taxCode: true, name: true, address: true },
    orderBy: { name: "asc" },
    take: SEARCH_LIMIT,
  }) as Promise<ListedCompany[]>;
}
