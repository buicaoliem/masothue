// Enriches sample tax codes via esgoo, upserts them, and prints the stored rows.
import { prisma } from "../db";
import { enrichTaxCode } from "../enrich";
import { EsgooSource } from "../sources/esgoo";

const taxCodes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["0101248141", "0300588569", "0601224050"];

async function main() {
  const source = new EsgooSource();
  for (const taxCode of taxCodes) {
    await enrichTaxCode(source, taxCode);
    const row = await prisma.company.findUnique({ where: { taxCode } });
    console.log(JSON.stringify(row, null, 2));
    await new Promise((r) => setTimeout(r, 500)); // stay under 2 req/s
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "enrich failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
