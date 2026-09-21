import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { countAbove, percentile, percentileTable } from "@/lib/industry/report";
import { SEO_CONFIG } from "./config";
import { evaluateIndustrySeoQuality, evaluateProvinceIndustrySeoQuality } from "./industry-quality";

const P = SEO_CONFIG.provinceIndustryQuality;
const I = SEO_CONFIG.industryQuality;
const ctx = { companiesWithIndustry: 200_000 };
const prov = (o: Partial<Parameters<typeof evaluateProvinceIndustrySeoQuality>[0]> = {}) => ({
  companyCount: 100, primaryCount: 0, registeredCount: 100, provinceIndustryCompanyCount: 10_000, saturationRatio: 0.01, sourceCount: 1, ...o,
});
const nat = (o: Partial<Parameters<typeof evaluateIndustrySeoQuality>[0]> = {}) => ({
  companyCount: 500, primaryCount: 0, registeredCount: 500, provinceCount: 5, sourceCount: 1, ...o,
});

test("province x industry: below the minimum is weak whatever else is true", () => {
  const q = evaluateProvinceIndustrySeoQuality(prov({ companyCount: P.minCompanies - 1, primaryCount: 50 }));
  assert.equal(q.indexable, false);
  assert.equal(q.tier, "weak");
  assert.match(q.reasons[0], /below-min/);
});

test("province x industry: a huge count is not enough when the code is saturated and there is no primary evidence", () => {
  const q = evaluateProvinceIndustrySeoQuality(prov({ companyCount: 100_000, provinceIndustryCompanyCount: 189_000, saturationRatio: P.maxSaturation + 0.05 }));
  assert.equal(q.indexable, false);
  assert.equal(q.tier, "weak");
  assert.match(q.reasons.join(), /saturated/);
  assert.equal(q.metrics.companyCount, 100_000);
});

test("province x industry: primary evidence buys room up to its own cap, not unlimited", () => {
  const between = P.maxSaturation + (P.maxSaturationWithPrimary - P.maxSaturation) / 2;
  const ok = evaluateProvinceIndustrySeoQuality(prov({ primaryCount: P.strongMinPrimary, saturationRatio: between }));
  assert.equal(ok.indexable, true);
  assert.equal(ok.tier, "strong");
  const over = evaluateProvinceIndustrySeoQuality(prov({ primaryCount: P.strongMinPrimary, saturationRatio: P.maxSaturationWithPrimary + 0.05 }));
  assert.equal(over.indexable, false);
  const noPrimary = evaluateProvinceIndustrySeoQuality(prov({ saturationRatio: between }));
  assert.equal(noPrimary.indexable, false, "the same saturation without primary evidence is rejected");
});

test("province x industry: reasonable registered-only hub is medium; a tiny denominator ignores saturation", () => {
  assert.equal(evaluateProvinceIndustrySeoQuality(prov()).tier, "medium");
  const small = evaluateProvinceIndustrySeoQuality(prov({ provinceIndustryCompanyCount: P.minDenominator - 1, saturationRatio: 0.99 }));
  assert.equal(small.indexable, true, "saturation is meaningless with a tiny denominator");
});

test("province x industry: exactly at the threshold flips, one below does not", () => {
  assert.equal(evaluateProvinceIndustrySeoQuality(prov({ companyCount: P.minCompanies })).indexable, true);
  assert.equal(evaluateProvinceIndustrySeoQuality(prov({ companyCount: P.minCompanies - 1 })).indexable, false);
});

test("national industry: thin, strong (primary), medium, and saturated (primary evidence does not excuse a catch-all code)", () => {
  assert.equal(evaluateIndustrySeoQuality(nat({ companyCount: I.minCompanies - 1 }), ctx).indexable, false);
  assert.equal(evaluateIndustrySeoQuality(nat({ primaryCount: I.strongMinPrimary }), ctx).tier, "strong");
  assert.equal(evaluateIndustrySeoQuality(nat(), ctx).tier, "medium");
  const heavy = Math.ceil(ctx.companiesWithIndustry * (I.maxSaturation + 0.05));
  assert.equal(evaluateIndustrySeoQuality(nat({ companyCount: heavy }), ctx).indexable, false);
  const withPrimary = evaluateIndustrySeoQuality(nat({ companyCount: heavy, primaryCount: I.strongMinPrimary * 10 }), ctx);
  assert.equal(withPrimary.indexable, false);
  assert.match(withPrimary.reasons.join(), /saturated/);
});

test("evaluator output carries metrics and reasons for every decision", () => {
  for (const q of [evaluateIndustrySeoQuality(nat(), ctx), evaluateProvinceIndustrySeoQuality(prov({ companyCount: 1 }))]) {
    assert.ok(q.reasons.length > 0);
    assert.equal(typeof q.metrics.companyCount, "number");
  }
});

test("sitemap, metadata and link selection all go through the same evaluator (no raw count rule)", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  const seoHelper = read("lib/industry/seo.ts");
  assert.match(seoHelper, /evaluateIndustrySeoQuality/);
  assert.match(seoHelper, /evaluateProvinceIndustrySeoQuality/);
  const sitemap = read("app/sitemaps/[file]/route.ts");
  assert.match(sitemap, /listIndexableIndustries/);
  assert.match(sitemap, /listIndexableProvinceIndustries/);
  assert.doesNotMatch(sitemap, /provinceIndustryMinCompanies/);
  assert.match(read("app/nganh/[slug]/page.tsx"), /evaluateIndustrySeoQuality/);
  assert.match(read("app/tinh/[slug]/nganh/[industry]/page.tsx"), /evaluateProvinceIndustrySeoQuality/);
  assert.match(read("app/sitemap.xml/route.ts"), /listIndexableProvinceIndustries/);
});

test("report helpers: percentiles and threshold sweeps", () => {
  assert.equal(percentile([], 50), 0);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50), 5);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 99), 10);
  assert.deepEqual(Object.keys(percentileTable([1, 2, 3])), ["P50", "P75", "P90", "P95", "P99"]);
  assert.deepEqual(countAbove([0.05, 0.2, 0.6], [0.1, 0.5]), { ">10%": 2, ">50%": 1 });
});
