// Normalize `province` + `provinceCode` for every company with an address, against the
// 34-province catalog. Unmatched tails are stored as null (no raw values kept).
// Logs counts and unmatched address TAILS only (province-level text), never full addresses.
import { prisma } from "../db";
import { addressTail, provinceFromAddress } from "../province";

const BATCH = 1000;

async function main() {
  let cursor: string | undefined;
  let total = 0;
  let matched = 0;
  const unmatched = new Map<string, number>();
  const byProvince = new Map<string, number>();

  for (;;) {
    const rows = await prisma.company.findMany({
      where: { address: { not: null } },
      select: { id: true, address: true, province: true, provinceCode: true },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const r of rows) {
      total++;
      const p = provinceFromAddress(r.address);
      if (p) {
        matched++;
        byProvince.set(p.name, (byProvince.get(p.name) ?? 0) + 1);
      } else {
        const tail = addressTail(r.address) ?? "(không có dấu phẩy)";
        unmatched.set(tail, (unmatched.get(tail) ?? 0) + 1);
      }
      const province = p?.name ?? null;
      const provinceCode = p?.code ?? null;
      if (r.province !== province || r.provinceCode !== provinceCode) {
        await prisma.company.update({ where: { id: r.id }, data: { province, provinceCode } });
      }
    }
  }

  console.log(JSON.stringify({
    withAddress: total,
    matched,
    unmatched: total - matched,
    matchedPct: total ? +((matched / total) * 100).toFixed(1) : 0,
    byProvince: Object.fromEntries([...byProvince].sort((a, b) => b[1] - a[1])),
    unmatchedTails: Object.fromEntries([...unmatched].sort((a, b) => b[1] - a[1]).slice(0, 30)),
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "backfill failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
