import { SEO_CONFIG } from "./config";

// Quality evaluator for industry landing pages. The ONLY authority for "may this industry / province x industry
// page be indexed": page metadata, sitemaps and internal-link selection all call these functions, so they cannot
// disagree. A raw company count is deliberately NOT enough: a code held by half of a province's companies is a
// catch-all registration habit, not a useful landing page.
//
// Tiers:
//   strong  enough companies with the code as EXPLICIT primary industry (real "main activity" evidence)
//   medium  no primary evidence, but registered membership is large enough and the code is not saturated
//   weak    below the minimum, or so widely registered that the page separates nothing -> noindex,follow

export type QualityTier = "strong" | "medium" | "weak";

export type IndustryQuality<M> = {
  indexable: boolean;
  tier: QualityTier;
  reasons: string[];
  metrics: M;
};

export type IndustryMetrics = {
  companyCount: number;
  primaryCount: number;
  registeredCount: number;
  provinceCount: number;
  sourceCount: number;
  saturation: number; // companyCount / companies with industry data (nationally)
};

export function evaluateIndustrySeoQuality(
  stat: { companyCount: number; primaryCount: number; registeredCount: number; provinceCount: number; sourceCount: number },
  ctx: { companiesWithIndustry: number },
  cfg = SEO_CONFIG.industryQuality,
): IndustryQuality<IndustryMetrics> {
  const saturation = ctx.companiesWithIndustry > 0 ? stat.companyCount / ctx.companiesWithIndustry : 0;
  const metrics = { ...stat, saturation };
  if (stat.companyCount < cfg.minCompanies) {
    return { indexable: false, tier: "weak", reasons: [`below-min-companies(<${cfg.minCompanies})`], metrics };
  }
  // Nationally the denominator is dominated by one registration-heavy source, so primary evidence does not excuse a catch-all code.
  if (saturation > cfg.maxSaturation) {
    return { indexable: false, tier: "weak", reasons: [`saturated(>${pctText(cfg.maxSaturation)} of companies with industry data)`], metrics };
  }
  if (stat.primaryCount >= cfg.strongMinPrimary) {
    return { indexable: true, tier: "strong", reasons: [`primary-evidence(>=${cfg.strongMinPrimary})`], metrics };
  }
  return { indexable: true, tier: "medium", reasons: ["registered-only, not saturated"], metrics };
}

export type ProvinceIndustryMetrics = {
  companyCount: number;
  primaryCount: number;
  registeredCount: number;
  provinceIndustryCompanyCount: number;
  saturation: number;
  sourceCount: number;
};

export function evaluateProvinceIndustrySeoQuality(
  stat: {
    companyCount: number;
    primaryCount: number;
    registeredCount: number;
    provinceIndustryCompanyCount: number;
    saturationRatio: number;
    sourceCount: number;
  },
  cfg = SEO_CONFIG.provinceIndustryQuality,
): IndustryQuality<ProvinceIndustryMetrics> {
  const metrics = {
    companyCount: stat.companyCount,
    primaryCount: stat.primaryCount,
    registeredCount: stat.registeredCount,
    provinceIndustryCompanyCount: stat.provinceIndustryCompanyCount,
    saturation: stat.saturationRatio,
    sourceCount: stat.sourceCount,
  };
  if (stat.companyCount < cfg.minCompanies) {
    return { indexable: false, tier: "weak", reasons: [`below-min-companies(<${cfg.minCompanies})`], metrics };
  }
  const meaningful = stat.provinceIndustryCompanyCount >= cfg.minDenominator;
  const strong = stat.primaryCount >= cfg.strongMinPrimary;
  const cap = strong ? cfg.maxSaturationWithPrimary : cfg.maxSaturation;
  if (meaningful && stat.saturationRatio > cap) {
    return { indexable: false, tier: "weak", reasons: [`saturated(>${pctText(cap)} of province${strong ? "" : ", no primary evidence"})`], metrics };
  }
  if (strong) return { indexable: true, tier: "strong", reasons: [`primary-evidence(>=${cfg.strongMinPrimary})`], metrics };
  return { indexable: true, tier: "medium", reasons: ["registered-only, not saturated"], metrics };
}

const pctText = (r: number) => `${Math.round(r * 100)}%`;
