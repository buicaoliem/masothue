// Read-only audit: classify every IndustryCatalog code against VSIC 2025 (Quyết định 36/2025/QĐ-TTg, Phụ lục I)
// and the (OCR-recovered) VSIC 2018 code list, and measure which classification each source dataset actually uses.
// Writes data/vsic/catalog-classification.json and docs/vsic-catalog-impact.md. Never writes to the database.
// Usage: npm run data:vsic-classify
import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "../db";

type V25 = { code: string; level: number; name: string };
const v25: V25[] = JSON.parse(readFileSync("data/vsic/vsic2025.json", "utf8"));
const o18 = JSON.parse(readFileSync("data/vsic/vsic2018-ocr-codes.json", "utf8")) as { level5: string[]; level4: string[] };
const N25 = new Map(v25.map((r) => [r.code, r]));
const S18 = new Set([...o18.level5, ...o18.level4]);
const norm = (s: string) => s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

type Status = "same-name-in-2025" | "name-differs-in-2025" | "absent-in-2025" | "unknown";

async function main() {
  const cat = await prisma.industryCatalog.findMany({ orderBy: { code: "asc" } });
  const rows = cat.map((c) => {
    const n25 = N25.get(c.code);
    const in18 = S18.has(c.code);
    const status: Status = n25 ? (norm(n25.name) === norm(c.name) ? "same-name-in-2025" : "name-differs-in-2025") : in18 ? "absent-in-2025" : "unknown";
    return {
      code: c.code,
      existsIn2018: in18 ? true : "unverified", // OCR list is incomplete: absence is not proof
      existsIn2025: !!n25,
      name2018: c.name, // spelling as observed in source data (2018-era), not an official 2018 name
      name2025: n25?.name ?? null,
      // Equal names do not prove equal scope (Phụ lục II wording can differ); only an official mapping can.
      sameMeaning: status === "same-name-in-2025" ? "name-equal (scope unverified)" : "unknown",
      status,
    };
  });
  const count = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).length;
  const summary = {
    totalCatalogCodes: rows.length,
    sameNameIn2025: count((r) => r.status === "same-name-in-2025"),
    nameDiffersIn2025: count((r) => r.status === "name-differs-in-2025"),
    absentIn2025: count((r) => r.status === "absent-in-2025"),
    unknown: count((r) => r.status === "unknown"),
  };

  // Which classification does each source use? Compare distinct source codes with 2018-only / 2025-only codes.
  const sourceCodes: Record<string, Map<string, number>> = {};
  const add = (src: string, code: string, n: number) => ((sourceCodes[src] ??= new Map()).set(code, n));
  for (const r of await prisma.$queryRawUnsafe<{ source: string; code: string; n: number }[]>(
    `select source, code, count(*)::int n from "CompanyIndustry" group by 1,2`,
  ))
    add(r.source, r.code, r.n);
  for (const r of await prisma.$queryRawUnsafe<{ source: string; code: string; n: number }[]>(
    `select source, c code, count(*)::int n from "CompanyIndustrySet", unnest(codes) c group by 1,2`,
  ))
    add(r.source, r.code, r.n);
  const sources = Object.entries(sourceCodes).map(([source, m]) => {
    const codes = [...m.keys()];
    const only2018 = codes.filter((c) => S18.has(c) && !N25.has(c));
    const only2025 = codes.filter((c) => N25.has(c) && !S18.has(c));
    const both = codes.filter((c) => N25.has(c) && S18.has(c));
    const membershipsOnly2018 = only2018.reduce((s, c) => s + m.get(c)!, 0);
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    return { source, distinctCodes: codes.length, memberships: total, codesOnlyIn2018List: only2018.length, membershipsOnlyIn2018List: membershipsOnly2018, codesOnlyIn2025List: only2025.length, codesInBoth: both.length, sampleOnly2018: only2018.slice(0, 15), sampleOnly2025: only2025.slice(0, 15) };
  });

  writeFileSync("data/vsic/catalog-classification.json", JSON.stringify({ generatedAt: new Date().toISOString(), summary, sources, rows }, null, 1));
  console.log(JSON.stringify({ summary, sources: sources.map((s) => ({ ...s, sampleOnly2018: undefined, sampleOnly2025: undefined })) }, null, 2));
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
