// Fill `province` from the address tail for OK rows that have an address but no province.
// Never overwrites an existing province. Logs counts only — no field values.
import { prisma } from "../db";
import { provinceFromAddress } from "../province";

async function main() {
  const rows = await prisma.company.findMany({
    where: { enrichStatus: "OK", province: null, address: { not: null } },
    select: { taxCode: true, address: true },
  });
  let filled = 0;
  for (const { taxCode, address } of rows) {
    const province = provinceFromAddress(address);
    if (!province) continue;
    await prisma.company.updateMany({ where: { taxCode, province: null }, data: { province } });
    filled++;
  }
  console.log(`candidates=${rows.length} filled=${filled}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "backfill failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
