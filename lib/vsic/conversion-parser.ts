// Deterministic parser for the official VSIC conversion tables (Công văn 3061/CTK-CSCL, Phụ lục I and II).
// Layout of each table row: 6 cells for the left system (cấp 1..5, tên) + 6 cells for the right system.
// A row whose left side is empty continues the previous left row: it adds one more right-hand code.
// No mapping is ever inferred from code or name similarity: every pair comes from a row of the table.
import type { VsicLevel, VsicMapping, VsicRelationship, VsicVersion } from "./types";

export class ConversionParseError extends Error {}

type Side = { code: string; level: VsicLevel; name: string; flagged: boolean };

const CODE_RE: Record<VsicLevel, RegExp> = { 1: /^[A-Z]$/, 2: /^\d{2}$/, 3: /^\d{3}$/, 4: /^\d{4}$/, 5: /^\d{5}$/ };
export const FLAG_NOTE =
  "Mã này được đánh dấu (*) trong bảng chuyển đổi chính thức; file không giải thích ký hiệu, cần đối chiếu nội dung ngành trong Phụ lục II của Quyết định 36/2025/QĐ-TTg.";

function readSide(cells: string[], rowIndex: number): Side[] {
  const name = cells[5] ?? "";
  const out: Side[] = [];
  for (let i = 0; i < 5; i++) {
    const raw = (cells[i] ?? "").trim();
    if (!raw) continue;
    const flagged = raw.includes("*");
    const code = raw.replace(/\*/g, "").trim();
    const level = (i + 1) as VsicLevel;
    if (!CODE_RE[level].test(code)) throw new ConversionParseError(`Row ${rowIndex}: malformed level-${level} code "${raw}"`);
    out.push({ code, level, name, flagged });
  }
  return out;
}

export type ParsedConversion = {
  fromVersion: VsicVersion;
  toVersion: VsicVersion;
  mappings: VsicMapping[];
  /** Codes of the "from" system present in the table with no counterpart in the "to" system. */
  unmappedFrom: { code: string; level: VsicLevel; name: string }[];
  /** Right-hand codes that continue no left row (should be empty for a well-formed table). */
  orphans: { code: string; level: VsicLevel; row: number }[];
  fromCodes: Map<string, Side>;
  toCodes: Map<string, Side>;
};

/** A documented correction of a typo in the official file: the raw text must match exactly or the build fails. */
export type SourceRepair = { row: number; cell: number; expect: string; replaceWith: string; reason: string };

export function parseConversionRows(rawRows: string[][], fromVersion: VsicVersion, toVersion: VsicVersion, repairs: SourceRepair[] = []): ParsedConversion {
  const rows = rawRows.map((r) => [...r]);
  for (const fix of repairs) {
    if (rows[fix.row]?.[fix.cell] !== fix.expect) throw new ConversionParseError(`Repair mismatch at row ${fix.row} cell ${fix.cell}: expected "${fix.expect}", found "${rows[fix.row]?.[fix.cell]}"`);
    rows[fix.row][fix.cell] = fix.replaceWith;
  }
  const header = rows.find((r) => r.length === 2);
  if (!header || !header[0].includes(fromVersion) || !header[1].includes(toVersion))
    throw new ConversionParseError(`Header does not match ${fromVersion} -> ${toVersion}: ${JSON.stringify(header)}`);

  const pairs = new Map<string, { from: Side; to: Side }>();
  const fromCodes = new Map<string, Side>();
  const toCodes = new Map<string, Side>();
  const mapped = new Set<string>();
  const orphans: ParsedConversion["orphans"] = [];
  const lastLeft: (Side | undefined)[] = [undefined, undefined, undefined, undefined, undefined, undefined];

  rows.forEach((cells, idx) => {
    if (cells.length !== 12) {
      if (cells.length === 2 || cells.length === 4) return; // title/header rows
      throw new ConversionParseError(`Row ${idx}: expected 12 cells, got ${cells.length}`);
    }
    if (/^cấp\s*1$/i.test(cells[0]) || cells[0] === "Mã") return;
    const left = readSide(cells.slice(0, 6), idx);
    const right = readSide(cells.slice(6, 12), idx);
    if (left.length) {
      const top = Math.min(...left.map((s) => s.level));
      for (let l = top; l <= 5; l++) lastLeft[l] = undefined;
      for (const s of left) {
        lastLeft[s.level] = s;
        if (!fromCodes.has(s.code)) fromCodes.set(s.code, s);
      }
    }
    for (const r of right) {
      if (!toCodes.has(r.code)) toCodes.set(r.code, r);
      const l = lastLeft[r.level];
      if (!l) {
        orphans.push({ code: r.code, level: r.level, row: idx });
        continue;
      }
      const key = `${l.code}>${r.code}`;
      const prev = pairs.get(key);
      pairs.set(key, prev ? { from: prev.from, to: { ...prev.to, flagged: prev.to.flagged || r.flagged } } : { from: { ...l }, to: r });
      mapped.add(l.code);
    }
  });

  const outDeg = new Map<string, number>();
  const inDeg = new Map<string, number>();
  for (const { from, to } of pairs.values()) {
    outDeg.set(from.code, (outDeg.get(from.code) ?? 0) + 1);
    inDeg.set(to.code, (inDeg.get(to.code) ?? 0) + 1);
  }
  const mappings: VsicMapping[] = [...pairs.values()].map(({ from, to }) => {
    const out = outDeg.get(from.code)!;
    const inn = inDeg.get(to.code)!;
    const relationship: VsicRelationship = out === 1 && inn === 1 ? "one_to_one" : out > 1 && inn === 1 ? "one_to_many" : out === 1 ? "many_to_one" : "many_to_many";
    const flagged = from.flagged || to.flagged;
    return {
      fromVersion,
      fromCode: from.code,
      fromName: from.name || undefined,
      toVersion,
      toCode: to.code,
      toName: to.name || undefined,
      relationship,
      ...(flagged ? { officialNote: FLAG_NOTE } : {}),
      level: from.level,
      flagged,
    };
  });
  const unmappedFrom = [...fromCodes.values()].filter((s) => !mapped.has(s.code)).map(({ code, level, name }) => ({ code, level, name }));
  return { fromVersion, toVersion, mappings, unmappedFrom, orphans, fromCodes, toCodes };
}
