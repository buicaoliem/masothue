// Regression audit for stale legal references. Flags citations of superseded documents that appear without an explicit
// historical/expired marker nearby. Legal citations belong in lib/legal/sources.ts; this only guards free text.
// Usage: npm run content:legal-audit   (exit 1 when anything is flagged)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["app", "lib", "content", "docs", "pipeline"];
const SKIP = [/node_modules/, /\.next/, /[\\/]legal([\\/]|$)/, /legal-audit/, /\.test\.ts$/, /docs[\\/]design[\\/]/, /seo-changelog\.md$/, /vsic-/];
const EXT = /\.(ts|tsx|md)$/;

/** pattern → why it is stale */
const STALE: [RegExp, string][] = [
  [/01\/2021\/NĐ-CP/, "Nghị định 01/2021/NĐ-CP hết hiệu lực 01/07/2025 (thay bằng 168/2025/NĐ-CP)"],
  [/105\/2020\/TT-BTC/, "Thông tư 105/2020/TT-BTC hết hiệu lực 06/02/2025 (thay bằng 86/2024/TT-BTC, nay là 90/2026/TT-BTC)"],
  [/86\/2024\/TT-BTC/, "Thông tư 86/2024/TT-BTC hết hiệu lực 01/07/2026 (thay bằng 90/2026/TT-BTC)"],
  [/27\/2018\/QĐ-TTg/, "Quyết định 27/2018/QĐ-TTg hết hiệu lực 15/11/2025 (thay bằng 36/2025/QĐ-TTg)"],
  [/\b21 ngành cấp 1\b|A đến U\b|\bA-U\b/, "hệ 2018 có 21 ngành cấp 1 (A-U); hệ 2025 có 22 (A-V)"],
];
const MARKER = /hết hiệu lực|đã hết|hệ 2018|VSIC 2018|hệ thống ngành 2018|ngành 2018|kinh tế 2018|thay thế|thay bằng|không còn|bị thay|so sánh|historical|expired|superseded|2018 (?:như|theo)/i;

export type Finding = { file: string; line: number; rule: string; text: string };

export function auditText(file: string, text: string): Finding[] {
  const lines = text.split(/\r?\n/);
  const out: Finding[] = [];
  lines.forEach((l, i) => {
    for (const [re, rule] of STALE) {
      if (!re.test(l)) continue;
      const ctx = lines.slice(Math.max(0, i - 2), i + 3).join(" ");
      if (!MARKER.test(ctx)) out.push({ file, line: i + 1, rule, text: l.trim().slice(0, 140) });
    }
  });
  // Luật Doanh nghiệp 59/2020 must be cited with its 2025 amendment in the same file.
  if (/59\/2020\/QH14/.test(text) && !/76\/2025\/QH15/.test(text)) {
    const i = lines.findIndex((l) => /59\/2020\/QH14/.test(l));
    out.push({ file, line: i + 1, rule: "Luật Doanh nghiệp 59/2020/QH14 phải đi kèm sửa đổi 76/2025/QH15", text: lines[i].trim().slice(0, 140) });
  }
  return out;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (SKIP.some((r) => r.test(p))) continue;
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (EXT.test(n)) acc.push(p);
  }
  return acc;
}

export function auditRepo(root = process.cwd()): Finding[] {
  return ROOTS.flatMap((r) => { try { return walk(join(root, r)); } catch { return []; } })
    .flatMap((f) => auditText(relative(root, f), readFileSync(f, "utf8")));
}

if (process.argv[1]?.includes("legal-audit")) {
  const f = auditRepo();
  for (const x of f) console.log(`${x.file}:${x.line}  ${x.rule}\n    ${x.text}`);
  console.log(f.length ? `\n${f.length} stale legal reference(s)` : "legal-audit: clean");
  process.exit(f.length ? 1 : 0);
}
