// Backfill CompanyIndustry from data ALREADY stored (Company.mainIndustry) - no external provider, no files.
// Usage: tsx pipeline/scripts/backfill-industries.ts [--apply] [--batch N]
//   default is a read-only DRY RUN; --apply writes.
// Idempotent and resumable: only companies that do not yet have a primary CompanyIndustry row are selected
// (keyset by id), so re-running continues where a failed run stopped and never duplicates.
// After the loop it rebuilds IndustryCatalog and reconciles Company.mainIndustry with the primary row.
// Industries beyond the primary come from `import-industries` (open-data files), not from here.
import { prismaSql } from "@/lib/directory/sql";
import { parseLegacyMainIndustry } from "@/lib/industry/normalize";
import { emptyIndustryStats, persistIndustries, rebuildIndustryCatalog, reconcileMainIndustry, type IndustryInput } from "@/lib/industry/persist";
import { measureCoverage, pct } from "@/lib/industry/coverage";
import { prisma } from "../db";

const LEGACY_SOURCE = "legacy-main-industry";

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const bi = argv.indexOf("--batch");
  const batchSize = bi >= 0 ? Number(argv[bi + 1]) : 1000;
  const sql = prismaSql(prisma);
  const stats = emptyIndustryStats();

  const before = await measureCoverage(sql);
  let lastId = "";
  let scanned = 0;
  let unparsable = 0;
  let failedBatches = 0;

  for (;;) {
    const rows = await sql.query<{ id: string; taxCode: string; mainIndustry: string; dataSource: string | null; dataAsOf: Date | null }>(
      `SELECT c.id, c."taxCode", c."mainIndustry", c."dataSource", c."dataAsOf"
       FROM "Company" c
       WHERE c.id > $1 AND c."mainIndustry" IS NOT NULL AND c."isHidden" = false
         AND NOT EXISTS (SELECT 1 FROM "CompanyIndustry" ci WHERE ci."companyId" = c.id AND ci."isPrimary")
       ORDER BY c.id LIMIT $2`,
      [lastId, batchSize],
    );
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].id;
    scanned += rows.length;

    const inputs: IndustryInput[] = [];
    for (const r of rows) {
      const primary = parseLegacyMainIndustry(r.mainIndustry);
      if (!primary) {
        unparsable++; // stays as-is; never guessed
        continue;
      }
      inputs.push({
        taxCode: r.taxCode,
        primary,
        others: [],
        prov: { source: r.dataSource ?? LEGACY_SOURCE, sourceUpdatedAt: r.dataAsOf ? r.dataAsOf.toISOString().slice(0, 10) : null },
      });
    }
    try {
      await persistIndustries(sql, inputs, { source: LEGACY_SOURCE, sourceUpdatedAt: null }, { apply, stats });
    } catch (err) {
      failedBatches++;
      console.error(`batch after id ${lastId} failed: ${err instanceof Error ? err.message : err}`);
    }
    if (scanned % (batchSize * 10) === 0) console.log(`scanned ${scanned}, primary +${stats.primaryInserted}`);
  }

  let catalog: unknown = "skipped (dry run)";
  let reconciled: unknown = "skipped (dry run)";
  if (apply) {
    catalog = await rebuildIndustryCatalog(sql);
    reconciled = await reconcileMainIndustry(sql);
  }
  const after = apply ? await measureCoverage(sql) : before;

  console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY RUN (read-only)", scanned, unparsableMainIndustry: unparsable, failedBatches, ...stats, catalog, mainIndustryRewritten: reconciled }, null, 2));
  console.log(
    `coverage: primary industry ${before.withPrimaryIndustry} -> ${after.withPrimaryIndustry} of ${after.listable} listable (${pct(after.withPrimaryIndustry, after.listable)}), unique industries ${after.uniqueIndustries}`,
  );
  if (failedBatches > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "backfill failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
