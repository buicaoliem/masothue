import { prisma } from "@/pipeline/db";
import { listableWhere } from "@/lib/company";
import { parseAddressArea, type AreaUnit } from "@/lib/seo/area";
import { richCompanyWhere } from "@/lib/seo/indexability";
import { SEO_CONFIG } from "@/lib/seo/config";

// District / ward view over INDEXABLE company pages (listable + richness gate), built from the address text
// (lib/seo/area.ts). Kept in process memory per province rather than in unstable_cache: a province's rows are
// 1-3 MB, above the 2 MB data-cache entry limit, and Railway runs one long-lived replica. Pages built from it are
// cached by ISR/Cloudflare anyway, so the index is only read on a cache miss.

export type AreaCompany = {
  taxCode: string;
  name: string;
  address: string;
  activeDate: Date | null;
  status: string | null;
  industryCode: string | null;
  industryName: string | null;
  district: AreaUnit | null;
  ward: AreaUnit | null;
};

export type WardNode = { unit: AreaUnit; companies: AreaCompany[] };
export type DistrictNode = { unit: AreaUnit; companies: AreaCompany[]; wards: Map<string, WardNode> };
export type ProvinceAreaIndex = { companies: AreaCompany[]; byTaxCode: Map<string, AreaCompany>; districts: Map<string, DistrictNode> };

const TTL_MS = 6 * 60 * 60 * 1000;
const memo = new Map<string, { at: number; value: Promise<ProvinceAreaIndex> }>();

const byTaxCode = (a: AreaCompany, b: AreaCompany) => a.taxCode.localeCompare(b.taxCode);

/** Pure grouping step, separated from the query so it can be tested without a database. */
export function buildAreaIndex(companies: AreaCompany[]): ProvinceAreaIndex {
  const sorted = [...companies].sort(byTaxCode);
  const districts = new Map<string, DistrictNode>();
  for (const c of sorted) {
    if (!c.district) continue;
    let d = districts.get(c.district.slug);
    if (!d) districts.set(c.district.slug, (d = { unit: c.district, companies: [], wards: new Map() }));
    d.companies.push(c);
    if (!c.ward) continue;
    let w = d.wards.get(c.ward.slug);
    if (!w) d.wards.set(c.ward.slug, (w = { unit: c.ward, companies: [] }));
    w.companies.push(c);
  }
  return { companies: sorted, byTaxCode: new Map(sorted.map((c) => [c.taxCode, c])), districts };
}

async function loadProvince(provinceSlug: string): Promise<ProvinceAreaIndex> {
  const [rows, catalog] = await Promise.all([
    prisma.company.findMany({
      where: await listableWhere({ provinceSlug, ...richCompanyWhere() }),
      select: {
        taxCode: true, name: true, address: true, activeDate: true, status: true,
        industries: { where: { isPrimary: true }, select: { code: true, name: true }, take: 1 },
      },
    }),
    prisma.industryCatalog.findMany({ select: { code: true, name: true } }),
  ]);
  const names = new Map(catalog.map((c) => [c.code, c.name]));
  return buildAreaIndex(
    rows.map((r) => {
      const primary = r.industries[0];
      const { district, ward } = parseAddressArea(r.address);
      return {
        taxCode: r.taxCode,
        name: r.name!,
        address: r.address!,
        activeDate: r.activeDate,
        status: r.status,
        industryCode: primary?.code ?? null,
        industryName: primary ? names.get(primary.code) ?? primary.name : null,
        district,
        ward,
      };
    }),
  );
}

/** Index for one province; refreshed every 6 h. A failed load is not memoised, so the next request retries. */
export function getProvinceAreaIndex(provinceSlug: string): Promise<ProvinceAreaIndex> {
  const hit = memo.get(provinceSlug);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = loadProvince(provinceSlug);
  memo.set(provinceSlug, { at: Date.now(), value });
  value.catch(() => memo.delete(provinceSlug));
  return value;
}

/** Hubs below the threshold render noindex and are never linked (a link to them would only spend crawl budget). */
export const isAreaHubLinkable = (count: number) => count >= SEO_CONFIG.areaMinCompanies;

/** Linkable districts of a province, largest first. */
export function linkableDistricts(index: ProvinceAreaIndex): DistrictNode[] {
  return [...index.districts.values()].filter((d) => isAreaHubLinkable(d.companies.length)).sort((a, b) => b.companies.length - a.companies.length);
}

/** Linkable wards of a district, largest first. */
export function linkableWards(district: DistrictNode): WardNode[] {
  return [...district.wards.values()].filter((w) => isAreaHubLinkable(w.companies.length)).sort((a, b) => b.companies.length - a.companies.length);
}

/** Most common primary industries in a list of companies (only rows whose source names a primary industry). */
export function topIndustries(companies: AreaCompany[], limit: number): { code: string; name: string; count: number }[] {
  const counts = new Map<string, { code: string; name: string; count: number }>();
  for (const c of companies) {
    if (!c.industryCode || !c.industryName) continue;
    const e = counts.get(c.industryCode) ?? { code: c.industryCode, name: c.industryName, count: 0 };
    e.count++;
    counts.set(c.industryCode, e);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)).slice(0, limit);
}

/**
 * Up to `limit` other indexable companies near `self`: same ward first, then the rest of the same district.
 * Returns which scope was used so the heading can say it truthfully.
 */
export function sameAreaCompanies(index: ProvinceAreaIndex, self: { taxCode: string; district: AreaUnit | null; ward: AreaUnit | null }, limit: number) {
  const district = self.district ? index.districts.get(self.district.slug) : undefined;
  if (!district) return { scope: null, companies: [] as AreaCompany[] };
  const others = (list: AreaCompany[]) => list.filter((c) => c.taxCode !== self.taxCode);
  const ward = self.ward ? district.wards.get(self.ward.slug) : undefined;
  const inWard = ward ? others(ward.companies) : [];
  if (inWard.length >= limit) return { scope: "ward" as const, companies: spread(inWard, self.taxCode, limit) };
  const rest = spread(others(district.companies).filter((c) => !inWard.includes(c)), self.taxCode, limit - inWard.length);
  const scope = inWard.length === 0 ? ("district" as const) : rest.length === 0 ? ("ward" as const) : ("ward+district" as const);
  return { scope, companies: [...inWard, ...rest] };
}

/** Same primary industry within the province, same district first. */
export function sameIndustryCompanies(index: ProvinceAreaIndex, self: { taxCode: string; district: AreaUnit | null }, code: string, limit: number) {
  const all = index.companies.filter((c) => c.industryCode === code && c.taxCode !== self.taxCode);
  const local = self.district ? all.filter((c) => c.district?.slug === self.district!.slug) : [];
  const rest = all.filter((c) => !local.includes(c));
  return { total: all.length, companies: [...spread(local, self.taxCode, limit), ...spread(rest, self.taxCode, limit)].slice(0, limit) };
}

/**
 * Deterministic window of `limit` rows starting just after `taxCode` (wrapping around). Every company gets a different
 * neighbour set, so links spread over the whole area instead of every page pointing at the same first five rows.
 */
function spread(list: AreaCompany[], taxCode: string, limit: number): AreaCompany[] {
  if (list.length <= limit) return list;
  const start = list.findIndex((c) => c.taxCode > taxCode);
  const from = start === -1 ? 0 : start;
  return Array.from({ length: limit }, (_, i) => list[(from + i) % list.length]);
}

export type DistrictHubLink = { provinceSlug: string; district: AreaUnit; count: number };

/** Largest linkable district hubs across the given provinces (homepage / directory link blocks). */
export async function topDistrictHubs(provinceSlugs: string[], limit: number): Promise<DistrictHubLink[]> {
  const indexes = await Promise.all(provinceSlugs.map(async (slug) => ({ slug, index: await getProvinceAreaIndex(slug) })));
  return indexes
    .flatMap(({ slug, index }) => linkableDistricts(index).map((d) => ({ provinceSlug: slug, district: d.unit, count: d.companies.length })))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
