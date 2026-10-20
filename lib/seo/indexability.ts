import type { Prisma } from "@prisma/client";
import { SEO_CONFIG } from "./config";

// The ONE place that decides whether a page may be indexed. Sitemap builders and page metadata
// both call these functions, so "in the sitemap" and "not noindex" cannot drift apart.

type CompanyLike = {
  name: string | null;
  address: string | null;
  taxCode: string;
  isHidden: boolean;
  enrichStatus: "PENDING" | "OK" | "SOURCE_MISS";
  status?: string | null;
  activeDate?: Date | string | null;
  representativeName?: string | null;
  mainIndustry?: string | null;
  capital?: unknown;
};

const text = (v: unknown) => typeof v === "string" && v !== "";
const nonNull = (v: unknown) => v !== null && v !== undefined;

/**
 * Data-richness signals. `has` (page side) and `where` (sitemap/SQL side) are defined together so they cannot drift.
 * Strings count when non-empty; capital counts when present and > 0.
 */
const RICHNESS_SIGNALS: { has: (c: CompanyLike) => boolean; where: Prisma.CompanyWhereInput }[] = [
  { has: (c) => text(c.mainIndustry), where: { mainIndustry: { not: null, notIn: [""] } } },
  { has: (c) => text(c.status), where: { status: { not: null, notIn: [""] } } },
  { has: (c) => text(c.representativeName), where: { representativeName: { not: null, notIn: [""] } } },
  { has: (c) => nonNull(c.capital) && Number(c.capital) > 0, where: { capital: { gt: 0 } } },
  { has: (c) => nonNull(c.activeDate), where: { activeDate: { not: null } } },
];

export const companyRichness = (c: CompanyLike) => RICHNESS_SIGNALS.filter((s) => s.has(c)).length;

/** True when the page carries enough real data to be worth a place in the index (always true when the gate is off). */
export function isCompanyRich(c: CompanyLike): boolean {
  const { enabled, minSignals } = SEO_CONFIG.companyRichness;
  return !enabled || companyRichness(c) >= minSignals;
}

/** Prisma filter equivalent of isCompanyRich: any `minSignals`-sized combination of signals all present. */
export function richCompanyWhere(): Prisma.CompanyWhereInput {
  const { enabled, minSignals } = SEO_CONFIG.companyRichness;
  if (!enabled) return {};
  const combos: Prisma.CompanyWhereInput[] = [];
  const pick = (start: number, chosen: Prisma.CompanyWhereInput[]) => {
    if (chosen.length === minSignals) return void combos.push({ AND: chosen });
    for (let i = start; i < RICHNESS_SIGNALS.length; i++) pick(i + 1, [...chosen, RICHNESS_SIGNALS[i].where]);
  };
  pick(0, []);
  return { OR: combos };
}

/**
 * Mirrors the LISTABLE SQL filter in lib/company.ts (removal requests are applied at query level), plus the richness
 * gate. A company with an approved business profile is always indexable (it has user-supplied content).
 */
export function isCompanyProfileIndexable(c: CompanyLike, opts: { hasApprovedProfile?: boolean } = {}): boolean {
  const listable = !c.isHidden && c.enrichStatus === "OK" && !!c.name?.trim() && !!c.address?.trim() && /^\d{10}(-\d{3})?$/.test(c.taxCode);
  return listable && (isCompanyRich(c) || !!opts.hasApprovedProfile);
}

/** /thong-ke/* statistics pages. Province stats additionally need the usual taxonomy substance. */
export const isStatsPageIndexable = () => SEO_CONFIG.indexStatsPages;

export type TaxonomyKind = "province" | "industry" | "legal-form" | "status" | "province-industry" | "new-companies";

const MIN: Record<TaxonomyKind, number> = {
  province: SEO_CONFIG.taxonomyMinCompanies,
  industry: SEO_CONFIG.taxonomyMinCompanies,
  "legal-form": SEO_CONFIG.taxonomyMinCompanies,
  status: SEO_CONFIG.taxonomyMinCompanies,
  "province-industry": SEO_CONFIG.provinceIndustryMinCompanies,
  "new-companies": SEO_CONFIG.newCompaniesMin,
};

export type TaxonomyPageData = { kind: TaxonomyKind; total: number; page?: number };

/**
 * Indexable taxonomy page rule: enough real listable companies, and only the first page of a
 * paginated list (deeper pages stay crawlable via anchors, but `noindex,follow`).
 */
export function isTaxonomyPageIndexable({ kind, total, page = 1 }: TaxonomyPageData): boolean {
  return page <= 1 && total >= MIN[kind];
}

/** Alias kept for call sites that read better as a verb. */
export const shouldIndexTaxonomyPage = isTaxonomyPageIndexable;

export const minCompaniesFor = (kind: TaxonomyKind) => MIN[kind];
