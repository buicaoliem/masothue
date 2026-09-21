# Industry SEO quality model

`lib/seo/industry-quality.ts` is the only authority on whether an industry hub (`/nganh/...`) or a province x industry
landing page (`/tinh/.../nganh/...`) may be indexed. Page metadata, the sitemap, the homepage / hub link lists and the
`/nganh` index all read it through `lib/industry/seo.ts`. Counts come from `IndustryStat` / `ProvinceIndustryStat`
(`npm run data:rebuild-industry-stats`), never from request-time scans.

Tiers: `strong` (enough explicit primary evidence), `medium` (registered-only but not a catch-all), `weak` (below the
minimum or saturated -> `noindex,follow`, not in the sitemap, not linked from lists). Data is never deleted for SEO reasons.

Thresholds live in `lib/seo/config.ts` and were chosen from `npm run seo:industry-quality-report` (2026-09-22, after the
compact HCM import):

- national saturation P50 0.9%, P90 9.7%, P95 17%, P99 29% -> `industryQuality.maxSaturation = 0.20` (drops the 20 broadest codes);
- province x industry saturation P50 0.3%, P90 5.3%, P95 10.5%, P99 25% -> registered-only `maxSaturation = 0.10`
  (drops 63 of 485 registered-only pairs with >= 30 companies);
- pairs with explicit primary evidence peak at 24.8% -> `maxSaturationWithPrimary = 0.30`;
- minimum 10 companies (national) / 30 (province x industry); "strong" needs 10 / 5 explicit primaries.

Semantics: HCM only provides *registered* industries (`CompanyIndustrySet`); primary industry stays unknown there and pages say
"có đăng ký ngành" (registered), never "ngành chính". Re-run the report after every import and revisit the thresholds.

Hub lists stop at page 50 (2,500 companies): an OFFSET of ~10,000 rows measured ~860 ms on the full data.
