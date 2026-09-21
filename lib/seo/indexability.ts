import { SEO_CONFIG } from "./config";

// The ONE place that decides whether a page may be indexed. Sitemap builders and page metadata
// both call these functions, so "in the sitemap" and "not noindex" cannot drift apart.

type CompanyLike = {
  name: string | null;
  address: string | null;
  taxCode: string;
  isHidden: boolean;
  enrichStatus: "PENDING" | "OK" | "SOURCE_MISS";
};

/** Mirrors the LISTABLE SQL filter in lib/company.ts (removal requests are applied at query level). */
export function isCompanyProfileIndexable(c: CompanyLike): boolean {
  return !c.isHidden && c.enrichStatus === "OK" && !!c.name?.trim() && !!c.address?.trim() && /^\d{10}(-\d{3})?$/.test(c.taxCode);
}

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
