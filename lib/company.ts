import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/pipeline/db";
import { ensureEnriched } from "@/lib/enrich";

// Only public business fields leave this module. No phone/email/personal IDs.
const PUBLIC_SELECT = {
  taxCode: true,
  name: true,
  nameForeign: true,
  nameShort: true,
  address: true,
  province: true,
  provinceSlug: true,
  status: true,
  activeDate: true,
  representativeName: true,
  mainIndustry: true,
  mainIndustryCode: true,
  legalType: true,
  taxOffice: true,
  lastEnrichedAt: true,
  dataSource: true,
  dataAsOf: true,
  enrichStatus: true,
  isHidden: true,
} as const;

// 10 digits, optionally a 3-digit branch suffix (0100111948-001).
export const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;

// Rows worth linking to or listing: enriched, with at least a name and an address, and not hidden
// (see listableWhere() below, which also excludes tax codes with an APPROVED removal request).
export const LISTABLE = {
  isHidden: false,
  enrichStatus: "OK",
  name: { not: null },
  address: { not: null },
} as const;

/** Tax codes with an APPROVED removal request; PENDING does not hide anything (prevents abuse). */
const loadApprovedRemovalTaxCodes = async (): Promise<string[]> => {
  const rows = await prisma.removalRequest.findMany({ where: { status: "APPROVED" }, select: { taxCode: true } });
  return rows.map((r) => r.taxCode);
};

// List pages, sitemaps and counts exclude these; the list is tiny and read on nearly every request, so it is
// cached briefly (60 s, and dropped at once by revalidateTag("removals") when an admin approves a request).
// The company page itself never uses this cache: isApprovedRemoval() below is always a live query.
const approvedRemovalTaxCodes = unstable_cache(loadApprovedRemovalTaxCodes, ["approved-removals"], { revalidate: 60, tags: ["removals"] });

/** True when this exact tax code has an APPROVED removal request. */
async function isApprovedRemoval(taxCode: string): Promise<boolean> {
  const r = await prisma.removalRequest.findFirst({ where: { taxCode, status: "APPROVED" }, select: { id: true } });
  return r !== null;
}

/**
 * LISTABLE plus every tax code with an APPROVED removal request excluded. A company is hidden
 * when isHidden = true OR it has an APPROVED (not just PENDING) removal request. Used by every
 * list/count query: sitemap, province hubs, "nearby" and search.
 */
export async function listableWhere(extra: Prisma.CompanyWhereInput = {}): Promise<Prisma.CompanyWhereInput> {
  const excluded = await approvedRemovalTaxCodes();
  if (excluded.length === 0) return { ...LISTABLE, ...extra };
  const existingTaxCode = (extra.taxCode ?? {}) as Prisma.StringFilter;
  return { ...LISTABLE, ...extra, taxCode: { ...existingTaxCode, notIn: excluded } };
}

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

/** Name for the removal-request form; store only (no enrichment), hidden/removed rows stay unnamed. */
export async function getCompanyNameForRequest(taxCode: string): Promise<string | null> {
  if (!TAX_CODE_RE.test(taxCode)) return null;
  const c = await prisma.company.findUnique({ where: { taxCode }, select: { name: true, isHidden: true } });
  if (!c || c.isHidden || (await isApprovedRemoval(taxCode))) return null;
  return c.name;
}

/** Official name/address for prefilling the directory submission form; store only, hidden/removed rows read as not found. */
export async function getCompanyForPrefill(taxCode: string): Promise<{ name: string; address: string } | null> {
  if (!TAX_CODE_RE.test(taxCode)) return null;
  const c = await prisma.company.findUnique({ where: { taxCode }, select: { name: true, address: true, isHidden: true } });
  if (!c || c.isHidden || !c.name || !c.address || (await isApprovedRemoval(taxCode))) return null;
  return { name: c.name, address: c.address };
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

/** Existence check for the "kiểm tra mã số thuế" tool; store only, no enrichment triggered. Hidden/removed rows read as not found. */
export async function findCompanyForLookup(taxCode: string): Promise<MstLookupInfo | null> {
  if (!TAX_CODE_RE.test(taxCode)) return null;
  const c = await prisma.company.findUnique({ where: { taxCode }, select: { name: true, isHidden: true, enrichStatus: true } });
  if (!c || c.isHidden || (await isApprovedRemoval(taxCode))) return null;
  return { name: c.name, enrichStatus: c.enrichStatus };
}

/**
 * Read a company by tax code; null means "render 404".
 * An APPROVED removal request hides it the same as isHidden (PENDING does not, to prevent abuse).
 * PENDING enrichment rows are enriched once (see lib/enrich.ts); the middleware normally does this
 * first and answers 503 when enrichment is unavailable. If it still fails here, EnrichUnavailableError is thrown.
 */
export const getCompany = cache(async (taxCode: string): Promise<ShowableCompany | null> => {
  if (!TAX_CODE_RE.test(taxCode)) return null;
  // Independent reads go out together: one round trip instead of two.
  const [removed, first] = await Promise.all([isApprovedRemoval(taxCode), findCompany(taxCode)]);
  if (removed) return null;
  let company = first;
  // Only a PENDING row needs the enrichment path (and a second read); everything else is served as read.
  if (company?.enrichStatus === "PENDING" && !company.isHidden) {
    if ((await ensureEnriched(taxCode)) === "unavailable") throw new EnrichUnavailableError(taxCode);
    company = await findCompany(taxCode);
    if (company?.enrichStatus === "PENDING" && !company.isHidden) throw new EnrichUnavailableError(taxCode);
  }
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

/** Up to `limit` other enriched companies in the same province, for the "nearby" block. One query (removal exclusion in SQL). */
export async function getNearbyCompanies(provinceSlug: string | null, excludeTaxCode: string, limit = 5) {
  if (!provinceSlug) return [];
  return prisma.$queryRaw<ListedCompany[]>`
    SELECT c."taxCode", c.name, c.address FROM "Company" c
    WHERE c."provinceSlug" = ${provinceSlug} AND c."taxCode" <> ${excludeTaxCode}
      AND c."isHidden" = false AND c."enrichStatus" = 'OK' AND c.name IS NOT NULL AND c.address IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "RemovalRequest" r WHERE r."taxCode" = c."taxCode" AND r.status = 'APPROVED')
    ORDER BY c."updatedAt" DESC LIMIT ${limit}`;
}

export const PROVINCE_PAGE_SIZE = 50;

/** One page (1-based) of listable companies in a province, plus the total count. */
export async function getProvinceCompanies(provinceSlug: string, page: number) {
  const where = await listableWhere({ provinceSlug });
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
  const where = await listableWhere({ provinceSlug: { not: null } });
  const groups = await prisma.company.groupBy({ by: ["provinceSlug"], where });
  return groups.map((g) => g.provinceSlug!);
}

export const SEARCH_LIMIT = 50;

/** Case-insensitive name match over listable companies only. */
export async function searchCompaniesByName(query: string) {
  return prisma.company.findMany({
    where: await listableWhere({ name: { contains: query, mode: "insensitive" } }),
    select: { taxCode: true, name: true, address: true },
    orderBy: { name: "asc" },
    take: SEARCH_LIMIT,
  }) as Promise<ListedCompany[]>;
}
