// Distribution report behind the industry SEO thresholds (lib/seo/config.ts).
// Reads the derived stats tables (run data:rebuild-industry-stats first). Read-only.
// Usage: npm run seo:industry-quality-report
import { getIndustryContext, listIndustryStats, listProvinceIndustryStats } from "@/lib/industry/service";
import { countAbove, percentileTable } from "@/lib/industry/report";
import { SEO_CONFIG } from "@/lib/seo/config";
import { evaluateIndustrySeoQuality, evaluateProvinceIndustrySeoQuality } from "@/lib/seo/industry-quality";
import { prisma } from "../db";

const pct = (r: number) => `${(r * 100).toFixed(1)}%`;

async function main() {
  const [industries, pairs, ctx] = await Promise.all([listIndustryStats(), listProvinceIndustryStats(), getIndustryContext()]);
  if (industries.length === 0) {
    console.log("No IndustryStat rows: run `npm run data:rebuild-industry-stats` first.");
    return;
  }
  console.log(`companies with industry data (national): ${ctx.companiesWithIndustry}`);
  console.log(`industries: ${industries.length}   province x industry rows: ${pairs.length}`);
  console.log("config:", JSON.stringify({ industryQuality: SEO_CONFIG.industryQuality, provinceIndustryQuality: SEO_CONFIG.provinceIndustryQuality }));

  console.log("\n== Industries: companyCount percentiles", JSON.stringify(percentileTable(industries.map((i) => i.companyCount))));
  const natSat = industries.map((i) => i.companyCount / Math.max(1, ctx.companiesWithIndustry));
  console.log("== Industries: national saturation percentiles", JSON.stringify(percentileTable(natSat.map((v) => +v.toFixed(4)))));
  console.log("== Industries with saturation above:", JSON.stringify(countAbove(natSat, [0.05, 0.1, 0.2, 0.3, 0.5])));
  const withPrimary = industries.filter((i) => i.primaryCount > 0);
  console.log(`== primary evidence: ${withPrimary.length} industries have >=1 explicit primary; ${industries.length - withPrimary.length} are registered-only`);
  console.log("   primaryCount percentiles (industries with primary):", JSON.stringify(percentileTable(withPrimary.map((i) => i.primaryCount))));
  const bySources: Record<string, number> = {};
  for (const i of industries) bySources[`${i.sourceCount} source(s)`] = (bySources[`${i.sourceCount} source(s)`] ?? 0) + 1;
  console.log("== industries by number of contributing sources:", JSON.stringify(bySources));

  console.log("\n== Top 20 industries by companyCount");
  console.log("code   companies  primary  registered  satur.  tier    indexable  reason");
  for (const i of industries.slice(0, 20)) {
    const q = evaluateIndustrySeoQuality(i, ctx);
    console.log(
      `${i.code.padEnd(6)} ${String(i.companyCount).padStart(9)} ${String(i.primaryCount).padStart(8)} ${String(i.registeredCount).padStart(11)}  ${pct(q.metrics.saturation).padStart(6)}  ${q.tier.padEnd(7)} ${String(q.indexable).padEnd(9)}  ${q.reasons.join("; ")}`,
    );
  }

  const sat = pairs.map((p) => p.saturationRatio);
  console.log("\n== Province x industry: saturation percentiles", JSON.stringify(percentileTable(sat.map((v) => +v.toFixed(4)))));
  const big = pairs.filter((p) => p.companyCount >= SEO_CONFIG.provinceIndustryQuality.minCompanies && p.primaryCount < SEO_CONFIG.provinceIndustryQuality.strongMinPrimary);
  console.log(`== registered-only pairs with >=${SEO_CONFIG.provinceIndustryQuality.minCompanies} companies: ${big.length}; saturation above:`, JSON.stringify(countAbove(big.map((p) => p.saturationRatio), [0.05, 0.1, 0.15, 0.2, 0.3, 0.5])));
  const strongPairs = pairs.filter((p) => p.primaryCount >= SEO_CONFIG.provinceIndustryQuality.strongMinPrimary);
  console.log(`== pairs with explicit primary evidence (>=${SEO_CONFIG.provinceIndustryQuality.strongMinPrimary}): ${strongPairs.length}; their saturation percentiles`, JSON.stringify(percentileTable(strongPairs.map((p) => +p.saturationRatio.toFixed(4)))), "max", Math.max(0, ...strongPairs.map((p) => p.saturationRatio)).toFixed(3));
  const perProvince: Record<string, number> = {};
  for (const p of pairs) perProvince[p.provinceSlug] = (perProvince[p.provinceSlug] ?? 0) + 1;
  console.log("== rows per province:", JSON.stringify(perProvince));

  const tiers = { strong: 0, medium: 0, weak: 0 };
  let indexable = 0;
  for (const p of pairs) {
    const q = evaluateProvinceIndustrySeoQuality(p);
    tiers[q.tier]++;
    if (q.indexable) indexable++;
  }
  const ind = industries.map((i) => evaluateIndustrySeoQuality(i, ctx));
  console.log(`\n== With current thresholds: industries indexable ${ind.filter((q) => q.indexable).length}/${industries.length}; province x industry indexable ${indexable}/${pairs.length}`, JSON.stringify(tiers));

  console.log("\n== Top 20 in ho-chi-minh (province x industry)");
  console.log("code   companies  primary  satur.  tier    indexable  reason");
  for (const p of pairs.filter((x) => x.provinceSlug === "ho-chi-minh").sort((a, b) => b.companyCount - a.companyCount).slice(0, 20)) {
    const q = evaluateProvinceIndustrySeoQuality(p);
    console.log(`${p.code.padEnd(6)} ${String(p.companyCount).padStart(9)} ${String(p.primaryCount).padStart(8)}  ${pct(p.saturationRatio).padStart(6)}  ${q.tier.padEnd(7)} ${String(q.indexable).padEnd(9)}  ${q.reasons.join("; ")}`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
