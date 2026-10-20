// Tunable SEO thresholds. Everything that decides "is this page worth indexing" reads from here,
// so page metadata and sitemaps can never disagree (see lib/seo/indexability.ts).

export const SEO_CONFIG = {
  /** A single-dimension hub (industry, legal form, status, province) needs this many listable companies to be indexed. */
  taxonomyMinCompanies: 10,
  /** Province × industry landing pages are far more numerous, so they need more substance. */
  provinceIndustryMinCompanies: 30,
  /** Pages of "new companies" are only indexed when the list is not trivially short. */
  newCompaniesMin: 10,
  /** How many companies appear on the homepage / new-companies hub. */
  homeNewCompanies: 12,
  newCompaniesPageSize: 50,
  /**
   * Industry hub quality model (lib/seo/industry-quality.ts). Values chosen from the measured distribution
   * (npm run seo:industry-quality-report), see docs/seo-industry-quality.md.
   */
  industryQuality: {
    /** Below this many companies a hub is too thin whatever else is true. */
    minCompanies: 10,
    /** Companies with the code as EXPLICIT primary: enough of them = "strong" evidence (real main-activity data). */
    strongMinPrimary: 10,
    /**
     * Share of all companies-with-industry-data that hold the code (registered or primary). Above it the code is a
     * catch-all registration habit and the national hub separates nothing. Measured: P95 = 17%, P99 = 29%; 20% removes
     * the 20 broadest codes (wholesale 46xx, installation 43xx, 7110/7310/7410).
     */
    maxSaturation: 0.2,
  },
  provinceIndustryQuality: {
    minCompanies: 30,
    strongMinPrimary: 5,
    /** Registered-only pairs (no primary evidence): companyCount / companies in the province with industry data. P95 of all pairs = 10.5%. */
    maxSaturation: 0.1,
    /** Pairs with primary evidence get more room; the observed maximum among them is 24.8%. */
    maxSaturationWithPrimary: 0.3,
    /** Saturation is meaningless with a tiny denominator; below this a pair is judged on counts only. */
    minDenominator: 100,
  },
  /**
   * Company-page richness gate (lib/seo/indexability.ts). A listable company page is indexed only when it carries
   * at least `minSignals` of: main industry, tax status, legal representative, charter capital, founding date.
   * Measured 2026-10-20 over 204,624 listable pages: 14,171 have >= 3 (rich), 190,453 have 2 (thin: only status + date).
   * Set `enabled: false` to index every listable page again; lower/raise `minSignals` to move the threshold.
   * Charter capital is imported nowhere yet (0 rows), so it currently never counts.
   */
  companyRichness: { enabled: true, minSignals: 3 },
  /** /thong-ke/* pages are ~67% duplicate of the hubs: keep them reachable but out of the index and sitemap. */
  indexStatsPages: false,
  /** Max URLs per sitemap file (protocol limit is 50,000). */
  sitemapMaxUrls: 50_000,
} as const;
