// Fill existing Company rows from a downloaded provincial open-data file (see pipeline/opendata.ts).
// Usage: tsx pipeline/scripts/import-opendata.ts --source hcm|sonla|quangngai [--limit N] [--offset N] [--apply]
//   --limit   data rows to read this run (default 1000)
//   --offset  first data row (0-based); default: the saved checkpoint, else 0
//   --apply   write changes; without it this is a read-only DRY RUN
// Files are read from tmp/opendata/ (not committed). Only whitelisted fields are ever read out of a row.
import { prismaSql } from "@/lib/directory/sql";
import { prisma } from "../db";
import { openSourceRows as openRows } from "../files";
import { SOURCES, runImport, type ImportStats, type SourceKey } from "../opendata";

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
  return { source: source as SourceKey, limit: num("limit") ?? 1000, offset: num("offset"), apply: argv.includes("--apply") };
}

function summary(s: ImportStats) {
  return {
    read: s.read,
    wouldFill: s.fill,
    rowsUpdated: s.updatedRows,
    becomeOk: s.becomeOk,
    skipped: {
      invalidMst: s.invalidMst,
      duplicateInFile: s.duplicate,
      notInDb: s.notInDb,
      hidden: s.hidden,
      removalRequest: s.removal,
      nothingToFill: s.nothingToFill,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { header, rows } = await openRows(args.source);
  let batchNo = 0;
  const result = await runImport(prismaSql(prisma), args.source, header, rows, {
    apply: args.apply,
    limit: args.limit,
    offset: args.offset,
    onBatch: args.apply
      ? (s, nextRow) => console.log(`batch ${++batchNo}: next row ${nextRow}, updated ${s.updatedRows}, became OK ${s.becomeOk}`)
      : undefined,
  });
  console.log(
    JSON.stringify(
      {
        mode: args.apply ? "APPLY" : "DRY RUN (read-only)",
        source: args.source,
        dataAsOf: SOURCES[args.source].dataAsOf,
        rows: `${result.start}..${result.nextRow - 1}`,
        ...summary(result.stats),
        samples: args.apply ? undefined : result.samples,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "import failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
