// Rebuilds the machine-readable VSIC data from the raw official files in data/vsic/raw (with checksums).
// Usage: npm run data:vsic-build
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { docxParagraphs, docxTableRows, docxXml } from "../lib/vsic/docx";
import { parseConversionRows, type SourceRepair } from "../lib/vsic/conversion-parser";
import { parseCatalogRows, parseContentParagraphs } from "../lib/vsic/catalog-parser";
import type { VsicSourceFile } from "../lib/vsic/types";

const DL = "2026-09-21";
const RAW = "data/vsic/raw/";
const files: (Omit<VsicSourceFile, "sha256" | "bytes" | "downloadedAt">)[] = [
  { id: "cv3061-pl1", title: "Công văn 3061/CTK-CSCL, Phụ lục I: Bảng chuyển đổi VSIC 2025 - VSIC 2018 (Cục Thống kê, đăng ngày 26/12/2025)", url: "https://www.nso.gov.vn/wp-content/uploads/2025/12/Phu-luc-I.-VSIC-2025-2018.docx", file: "Phu-luc-I.-VSIC-2025-2018.docx" },
  { id: "cv3061-pl2", title: "Công văn 3061/CTK-CSCL, Phụ lục II: Bảng chuyển đổi VSIC 2018 - VSIC 2025 (Cục Thống kê, đăng ngày 26/12/2025)", url: "https://www.nso.gov.vn/wp-content/uploads/2025/12/Phu-luc-II.-VSIC-2018-2025.docx", file: "Phu-luc-II.-VSIC-2018-2025.docx" },
  { id: "qd36-pl1", title: "Quyết định 36/2025/QĐ-TTg, Phụ lục I: Danh mục Hệ thống ngành kinh tế Việt Nam (bản trên Cổng thông tin quốc gia về đăng ký doanh nghiệp)", url: "https://dangkykinhdoanh.gov.vn/Images/FileVanBan/_12.9_PL1kinhtevietnam.docx", file: "QD36-_12.9_PL1kinhtevietnam.docx" },
  { id: "qd36-pl2", title: "Quyết định 36/2025/QĐ-TTg, Phụ lục II: Nội dung ngành kinh tế Việt Nam (bản trên Cổng thông tin quốc gia về đăng ký doanh nghiệp)", url: "https://dangkykinhdoanh.gov.vn/Images/FileVanBan/_12.9_PL2kinhtevietnam.docx", file: "QD36-_12.9_PL2kinhtevietnam.docx" },
];
const buf = new Map<string, Buffer>();
const sources: VsicSourceFile[] = files.map((f) => {
  const b = readFileSync(RAW + f.file);
  buf.set(f.id, b);
  return { ...f, sha256: createHash("sha256").update(b).digest("hex"), bytes: b.length, downloadedAt: DL };
});
const xml = (id: string) => docxXml(buf.get(id)!);

// 2025 catalog (Phụ lục I of QĐ 36/2025) + content notes (Phụ lục II)
const catalog = parseCatalogRows(docxTableRows(xml("qd36-pl1")).filter((r) => r.length === 6), "2025", "qd36-pl1");
const content = parseContentParagraphs(docxParagraphs(xml("qd36-pl2")), new Set(catalog.map((c) => c.code)));
const counts = [1, 2, 3, 4, 5].map((l) => catalog.filter((c) => c.level === l).length);
if (counts.join() !== "22,87,259,495,743") throw new Error(`Unexpected 2025 level counts ${counts}`);

// Conversion tables
// The only defect found in the official conversion files: a stray character in a code cell (checked by scanning every cell) and one duplicated code.
const REPAIRS_PL1: SourceRepair[] = [
  { row: 1250, cell: 4, expect: "58291", replaceWith: "58292", reason: "Code 58291 appears twice (rows 1249 and 1250). Row 1250 is named 'Xuất bản phần mềm ứng dụng', which is 58292 in Phụ lục I of QĐ 36/2025 (catalog cross-check)." },{ row: 1487, cell: 8, expect: "ữ", replaceWith: "", reason: "Stray character 'ữ' in the level-3 code cell of a continuation row (next to 78302); no code is intended there." }];
const c1825 = parseConversionRows(docxTableRows(xml("cv3061-pl2")), "2018", "2025");
const c2518 = parseConversionRows(docxTableRows(xml("cv3061-pl1")), "2025", "2018", REPAIRS_PL1);
for (const c of [c1825, c2518]) if (c.orphans.length) throw new Error(`Orphan rows in ${c.fromVersion}->${c.toVersion}: ${JSON.stringify(c.orphans.slice(0, 5))}`);

// Cross-check: 2025 codes in the official conversion table must equal the 2025 catalog.
const cat = new Set(catalog.map((c) => c.code));
const tbl = new Set([...c1825.toCodes.keys()].concat([...c2518.fromCodes.keys()]));
const missingInTable = [...cat].filter((c) => !tbl.has(c));
const notInCatalog = [...tbl].filter((c) => !cat.has(c));

const stat = (m: typeof c1825) => {
  const l5 = m.mappings.filter((x) => x.level === 5);
  const by = (r: string, l?: number) => m.mappings.filter((x) => x.relationship === r && (l === undefined || x.level === l)).length;
  return {
    fromCodes: m.fromCodes.size,
    toCodes: m.toCodes.size,
    pairs: m.mappings.length,
    level5Pairs: l5.length,
    one_to_one: by("one_to_one"),
    one_to_many: by("one_to_many"),
    many_to_one: by("many_to_one"),
    many_to_many: by("many_to_many"),
    level5: { one_to_one: by("one_to_one", 5), one_to_many: by("one_to_many", 5), many_to_one: by("many_to_one", 5), many_to_many: by("many_to_many", 5) },
    flagged: m.mappings.filter((x) => x.flagged).length,
    unmappedFrom: m.unmappedFrom.length,
  };
};
const stats = { "2018->2025": stat(c1825), "2025->2018": stat(c2518), crossCheck: { missingInTable, notInCatalog } };

const out = (f: string, v: unknown) => writeFileSync(`data/vsic/${f}`, JSON.stringify(v));
out("vsic2025-catalog.json", catalog);
out("vsic2025-content.json", Object.fromEntries([...content].map(([k, v]) => [k, { ...(v.description.length ? { d: v.description } : {}), ...(v.exclusions.length ? { x: v.exclusions } : {}) }])));
out("vsic-mapping.json", { "2018-2025": { mappings: c1825.mappings, unmapped: c1825.unmappedFrom }, "2025-2018": { mappings: c2518.mappings, unmapped: c2518.unmappedFrom } });
writeFileSync("data/vsic/vsic-sources.json", JSON.stringify({ sources, sourceRepairs: { "cv3061-pl1": REPAIRS_PL1 }, stats, catalogCounts: counts, contentCodes: content.size }, null, 2));
console.log(JSON.stringify({ stats, counts, contentCodes: content.size }, null, 2));
