// Recompute IndustryStat / ProvinceIndustryStat from the source-of-truth tables.
// Usage: npm run data:rebuild-industry-stats [-- --dry-run]
// Idempotent and deterministic; run it after every industry import.
import { prismaSql } from "@/lib/directory/sql";
import { rebuildIndustryStats } from "@/lib/industry/stats";
import { prisma } from "../db";

async function main() {
  const apply = !process.argv.includes("--dry-run");
  const t0 = Date.now();
  const r = await rebuildIndustryStats(prismaSql(prisma), { apply });
  console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY RUN (nothing written)", seconds: +((Date.now() - t0) / 1000).toFixed(1), ...r }, null, 2));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "rebuild failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
