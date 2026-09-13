// Calls EsgooSource for sample tax codes and prints the mapped result.
// No database access.
import { EsgooSource } from "../sources/esgoo";

const taxCodes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["0101248141", "0300588569", "0601224050"];

async function main() {
  const source = new EsgooSource();
  for (const taxCode of taxCodes) {
    const result = await source.fetchByTaxCode(taxCode);
    console.log(JSON.stringify(result, null, 2));
    await new Promise((r) => setTimeout(r, 500)); // stay under 2 req/s
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
