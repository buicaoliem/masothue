// Populate CompanyIndustry from a downloaded provincial open-data file (no external API is called).
// Usage: tsx pipeline/scripts/import-industries.ts --source hcm|sonla|quangngai [--limit N] [--offset N] [--apply]
//   --limit   data rows to read this run (default: whole file)
//   --offset  first data row (0-based); default: the saved checkpoint, else 0
//   --apply   write; without it this is a read-only DRY RUN
// Run `data:backfill-industries` afterwards to rebuild the industry catalog and reconcile Company.mainIndustry.
import { prismaSql } from "@/lib/directory/sql";
import { prisma } from "../db";
import { openSourceRows } from "../files";
import { INDUSTRY_COLUMNS, runIndustryImport } from "../industry-source";
import { SOURCES, type SourceKey } from "../opendata";

function parseArgs(argv: string[]) {
  const get = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const source = get("source");
  if (!source || !(source in SOURCES)) throw new Error("--source hcm|sonla|quangngai is required");
  const num = (name: string) => {
    const v = get(name);
    if (v === undefined) return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) throw new Error(`--${name} must be a non-negative integer`);
    return n;
  };
  return { source: source as SourceKey, limit: num("limit") ?? Number.MAX_SAFE_INTEGER, offset: num("offset"), apply: argv.includes("--apply") };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { header, rows } = await openSourceRows(args.source);
  let batchNo = 0;
  const r = await runIndustryImport(prismaSql(prisma), args.source, header, rows, {
    apply: args.apply,
    limit: args.limit,
    offset: args.offset,
    onBatch: ({ stats, setStats }, next) => {
      if (++batchNo % 20 === 0) {
        console.log(
          r_mode_is_set(args.source)
            ? `batch ${batchNo}: next row ${next}, companies ${setStats.companiesWithIndustries}, memberships ${setStats.memberships}, compact rows +${setStats.rowsInserted}/~${setStats.rowsUpdated}`
            : `batch ${batchNo}: next row ${next}, primary +${stats.primaryInserted}, other +${stats.otherInserted}, companies ${stats.companiesTouched}`,
        );
      }
    },
    onError: (err, at) => console.error(`batch failed near row ${at}: ${err instanceof Error ? err.message : err}`),
  });

  const head = {
    mode: args.apply ? "APPLY" : "DRY RUN (read-only)",
    storage: r.mode === "set" ? "CompanyIndustrySet (compact text[], no primary, mainIndustry untouched)" : "CompanyIndustry rows",
    source: SOURCES[args.source].dataSource,
    dataAsOf: SOURCES[args.source].dataAsOf,
    rows: `${r.start}..${r.nextRow - 1}`,
    invalidMstOrNoIndustry: r.invalidOrEmpty,
    invalidIndustryEntries: r.counters.malformedEntries,
    duplicateEntriesInsideCells: r.counters.duplicateEntries,
    failedBatches: r.failedBatches,
  };
  if (r.mode === "set") {
    const s = r.setStats;
    console.log(
      JSON.stringify(
        {
          ...head,
          companiesMatched: s.companiesMatched,
          companiesWithIndustries: s.companiesWithIndustries,
          uniqueCodes: r.uniqueCodes.size,
          totalMemberships: s.memberships,
          avgIndustriesPerCompany: s.companiesWithIndustries ? +(s.memberships / s.companiesWithIndustries).toFixed(1) : 0,
          compactRowsToInsert: s.rowsInserted,
          compactRowsToUpdate: s.rowsUpdated,
          rowsUnchanged: s.rowsUnchanged,
          estimatedHeapStorageMB: +(s.estimatedBytes / 1e6).toFixed(1),
          unknownCatalogCodes: s.newCatalogCodes,
          skipped: { companyNotFound: s.companyNotFound, hiddenOrRemoval: s.skippedHiddenOrRemoval, notListable: s.skippedNotListable },
        },
        null,
        2,
      ),
    );
    const top = [...r.frequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    console.log("top codes by companies (share of matched companies):");
    for (const [code, n] of top) console.log(`  ${code}  ${String(n).padStart(7)}  ${((n / Math.max(1, s.companiesMatched)) * 100).toFixed(1)}%`);
  } else {
    console.log(JSON.stringify({ ...head, ...r.stats }, null, 2));
  }
  if (r.failedBatches > 0) process.exitCode = 1;
}

const r_mode_is_set = (source: SourceKey) => INDUSTRY_COLUMNS[source].mode === "set";

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "import failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
