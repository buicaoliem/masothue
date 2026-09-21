// Parsers for the official VSIC 2025 text (Quyết định 36/2025/QĐ-TTg): Phụ lục I (list) and Phụ lục II (content notes).
import type { VsicEntry, VsicLevel } from "./types";

const CODE_RE: Record<VsicLevel, RegExp> = { 1: /^[A-Z]$/, 2: /^\d{2}$/, 3: /^\d{3}$/, 4: /^\d{4}$/, 5: /^\d{5}$/ };

export function parseCatalogRows(rows: string[][], version: "2018" | "2025", source: string): VsicEntry[] {
  const out: VsicEntry[] = [];
  let section: string | undefined;
  rows.forEach((cells, idx) => {
    if (cells.length !== 6) throw new Error(`Row ${idx}: expected 6 cells, got ${cells.length}`);
    if (/^cấp\s*1$/i.test(cells[0])) return;
    if (/^\d+$/.test(cells[0]) && cells[5] === "") return; // totals row
    const name = cells[5];
    for (let i = 0; i < 5; i++) {
      const code = cells[i].replace(/\*/g, "").trim();
      if (!code) continue;
      const level = (i + 1) as VsicLevel;
      if (!CODE_RE[level].test(code)) throw new Error(`Row ${idx}: malformed level-${level} code "${cells[i]}"`);
      if (!name) throw new Error(`Row ${idx}: code ${code} has no name`);
      if (level === 1) section = code;
      const parentCode = level === 1 ? undefined : level === 2 ? section : code.slice(0, code.length - 1);
      out.push({ version, code, level, name, ...(parentCode ? { parentCode } : {}), source });
    }
  });
  const seen = new Set<string>();
  for (const e of out) {
    if (seen.has(e.code)) throw new Error(`Duplicate code ${e.code}`);
    seen.add(e.code);
  }
  for (const e of out) if (e.parentCode && !seen.has(e.parentCode)) throw new Error(`Code ${e.code}: parent ${e.parentCode} missing`);
  return out;
}

export type VsicContent = { description: string[]; exclusions: string[] };

const HEADING = /^([A-V]|\d{2,5})(?: - (\d{4,5}))?: (\S.*)$/;

/**
 * Phụ lục II: a heading paragraph "CODE: NAME" or "4DIGIT - 5DIGIT: NAME" opens a section; following paragraphs are its
 * content. From the first paragraph beginning "Loại trừ" on, paragraphs of that section are exclusions.
 * A "4 - 5 digit" heading gives the same content to both codes.
 */
export function parseContentParagraphs(paragraphs: string[], known: Set<string>): Map<string, VsicContent> {
  const out = new Map<string, VsicContent>();
  let cur: VsicContent | undefined;
  let inExclusion = false;
  let started = false;
  for (const p of paragraphs) {
    const m = HEADING.exec(p);
    if (m && (known.has(m[1]) || (m[2] && known.has(m[2])))) {
      started = true;
      cur = { description: [], exclusions: [] };
      inExclusion = false;
      for (const c of [m[1], m[2]]) if (c && known.has(c) && !out.has(c)) out.set(c, cur);
      continue;
    }
    if (!started || !cur) continue;
    if (/^Loại trừ(?:\s|:|$)/.test(p)) inExclusion = true;
    (inExclusion ? cur.exclusions : cur.description).push(p);
  }
  return out;
}
