// Machine-readable code-level diff between VSIC 2018 (OCR code list) and VSIC 2025 (Phụ lục I, exact).
// Without an official mapping table, splits and merges cannot be told apart from remove+new, so they are NOT claimed.
// Usage: npm run data:vsic-diff  -> data/vsic/vsic-code-diff.json
import { readFileSync, writeFileSync } from "node:fs";

export type IndustryClassificationChange = {
  level: 2 | 3 | 4 | 5;
  oldCode?: string;
  newCode?: string;
  changeType:
    | "unchanged" // same code, same name (catalog-evidenced), scope not proven equal
    | "renamed" // same code, different name (catalog-evidenced): may be a cosmetic or a semantic change
    | "present-in-both" // same code in both lists, name not comparable (2018 names not machine-readable)
    | "removed-or-restructured" // in 2018 list only: removed, split or merged, unknown without official mapping
    | "new-or-restructured"; // in 2025 list only: new, or target of a split/merge
  name2025?: string;
  name2018Observed?: string; // spelling observed in source data
  notes?: string;
};

const v25: { code: string; level: number; name: string }[] = JSON.parse(readFileSync("data/vsic/vsic2025.json", "utf8"));
const o18 = JSON.parse(readFileSync("data/vsic/vsic2018-ocr-codes.json", "utf8")) as Record<string, string[]>;
const cls = JSON.parse(readFileSync("data/vsic/catalog-classification.json", "utf8")) as { rows: { code: string; name2018: string; status: string }[] };
const observed = new Map(cls.rows.map((r) => [r.code, r]));
const changes: IndustryClassificationChange[] = [];

for (const level of [2, 3, 4, 5] as const) {
  const old = new Set(o18[`level${level}`]);
  const cur = new Map(v25.filter((r) => r.level === level).map((r) => [r.code, r.name]));
  for (const [code, name] of cur) {
    if (old.has(code)) {
      const ob = observed.get(code);
      changes.push({ level, oldCode: code, newCode: code, name2025: name, changeType: !ob ? "present-in-both" : ob.status === "same-name-in-2025" ? "unchanged" : "renamed", ...(ob ? { name2018Observed: ob.name2018 } : {}) });
    } else changes.push({ level, newCode: code, name2025: name, changeType: "new-or-restructured", notes: "2018 list is OCR-derived and may miss codes" });
  }
  for (const code of old) if (!cur.has(code)) changes.push({ level, oldCode: code, changeType: "removed-or-restructured", ...(observed.get(code) ? { name2018Observed: observed.get(code)!.name2018 } : {}) });
}
const count = (t: string) => changes.filter((c) => c.changeType === t).length;
const summary = Object.fromEntries(["unchanged", "renamed", "present-in-both", "removed-or-restructured", "new-or-restructured"].map((t) => [t, count(t)]));
writeFileSync("data/vsic/vsic-code-diff.json", JSON.stringify({ note: "Level-1 (A-U → A-V; J split into J and K) and level-2 (45 removed) are documented in docs/vsic-2025-audit.md", summary, changes }));
console.log(summary);
