// Converter between VSIC 2018 and VSIC 2025 built ONLY on the official conversion tables (Công văn 3061/CTK-CSCL).
// It never picks a target for the user and never derives a mapping from code or name similarity.
import mappingJson from "@/data/vsic/vsic-mapping.json";
import { foldVi } from "./normalize";
import type { VsicLevel, VsicMapping, VsicVersion } from "./types";

type Direction = { mappings: VsicMapping[]; unmapped: { code: string; level: VsicLevel; name: string }[] };
const FILE = mappingJson as unknown as Record<"2018-2025" | "2025-2018", Direction>;

const dirOf = (from: VsicVersion): Direction => FILE[from === "2018" ? "2018-2025" : "2025-2018"];

type Index = { byFrom: Map<string, VsicMapping[]>; byTo: Map<string, VsicMapping[]>; names: Map<string, { name: string; level: VsicLevel }> };
const INDEX = new Map<VsicVersion, Index>();
function indexFor(from: VsicVersion): Index {
  let idx = INDEX.get(from);
  if (idx) return idx;
  const d = dirOf(from);
  idx = { byFrom: new Map(), byTo: new Map(), names: new Map() };
  for (const m of d.mappings) {
    (idx.byFrom.get(m.fromCode) ?? idx.byFrom.set(m.fromCode, []).get(m.fromCode)!).push(m);
    (idx.byTo.get(m.toCode) ?? idx.byTo.set(m.toCode, []).get(m.toCode)!).push(m);
    if (m.fromName && !idx.names.has(m.fromCode)) idx.names.set(m.fromCode, { name: m.fromName, level: m.level });
  }
  for (const u of d.unmapped) if (!idx.names.has(u.code)) idx.names.set(u.code, { name: u.name, level: u.level });
  INDEX.set(from, idx);
  return idx;
}

export const REVIEW_NOTE = "Cần đối chiếu hoạt động thực tế để chọn mã phù hợp.";

export type ConversionResult =
  | { status: "invalid"; message: string }
  | { status: "not_found"; from: VsicVersion; code: string }
  | {
      status: "found";
      from: VsicVersion;
      to: VsicVersion;
      code: string;
      name: string;
      level: VsicLevel;
      /** Official pairs for exactly this code. Empty when the table links only a higher level (see `viaParent`). */
      targets: VsicMapping[];
      /** Other codes of the source system that map to the same target(s) (many-to-one / many-to-many). */
      peers: { code: string; name?: string }[];
      /** Set when the code has no pair of its own; the official table links only the parent level. */
      viaParent?: { code: string; name?: string; targets: VsicMapping[] };
      needsReview: boolean;
      reviewNotes: string[];
    };

const CODE_OK = /^([A-Z]|\d{2,5})$/;

export function normalizeCodeInput(raw: string): string {
  return raw.trim().replace(/[\s.\-_]/g, "").toUpperCase();
}

export function convertCode(fromVersion: VsicVersion, rawCode: string): ConversionResult {
  const code = normalizeCodeInput(rawCode);
  if (!CODE_OK.test(code)) return { status: "invalid", message: "Mã ngành gồm 1 chữ cái (cấp 1) hoặc 2 đến 5 chữ số." };
  const idx = indexFor(fromVersion);
  const info = idx.names.get(code);
  if (!info) return { status: "not_found", from: fromVersion, code };
  const to: VsicVersion = fromVersion === "2018" ? "2025" : "2018";
  const targets = idx.byFrom.get(code) ?? [];
  const reviewNotes: string[] = [];
  let viaParent: { code: string; name?: string; targets: VsicMapping[] } | undefined;
  if (targets.length === 0 && code.length > 2) {
    for (let l = code.length - 1; l >= 2; l--) {
      const p = idx.byFrom.get(code.slice(0, l));
      if (p?.length) {
        viaParent = { code: code.slice(0, l), name: idx.names.get(code.slice(0, l))?.name, targets: p };
        break;
      }
    }
    reviewNotes.push("Bảng chính thức không có dòng riêng cho mã này; chỉ có liên kết ở cấp cao hơn.");
  }
  const shown = targets.length ? targets : (viaParent?.targets ?? []);
  const peerMap = new Map<string, string | undefined>();
  for (const t of shown) for (const back of idx.byTo.get(t.toCode) ?? []) if (back.fromCode !== code && back.level === t.level) peerMap.set(back.fromCode, back.fromName);
  const distinctTargets = new Set(shown.map((t) => t.toCode)).size;
  if (distinctTargets > 1) reviewNotes.push("Một mã có nhiều mã tương ứng trong bảng chính thức: không thể tự chọn hộ.");
  if (peerMap.size > 0) reviewNotes.push("Có mã khác của hệ nguồn cùng chuyển về mã đích này (nhiều mã gộp chung).");
  if (shown.some((t) => t.flagged)) reviewNotes.push("Có mã được đánh dấu (*) trong bảng chính thức.");
  const needsReview = shown.length === 0 || distinctTargets > 1 || peerMap.size > 0 || shown.some((t) => t.flagged || t.relationship !== "one_to_one") || !!viaParent;
  if (shown.length === 0) reviewNotes.push("Không có mã tương ứng trong bảng chính thức (mã mới hoặc bị bãi bỏ ở hệ đích).");
  if (needsReview) reviewNotes.push(REVIEW_NOTE);
  return {
    status: "found",
    from: fromVersion,
    to,
    code,
    name: info.name,
    level: info.level,
    targets,
    peers: [...peerMap].map(([c, name]) => ({ code: c, name })),
    ...(viaParent ? { viaParent } : {}),
    needsReview,
    reviewNotes,
  };
}

/** Name search inside one system's list of the conversion table (2018 names come from the official table itself). */
export function searchConversionNames(from: VsicVersion, query: string, limit = 20): { code: string; name: string; level: VsicLevel }[] {
  const q = foldVi(query);
  if (!q) return [];
  const words = q.split(" ");
  const out: { code: string; name: string; level: VsicLevel; exact: boolean }[] = [];
  for (const [code, { name, level }] of indexFor(from).names) {
    const f = foldVi(name);
    if (words.every((w) => f.includes(w))) out.push({ code, name, level, exact: f.includes(q) });
  }
  out.sort((a, b) => Number(b.exact) - Number(a.exact) || b.level - a.level || a.code.localeCompare(b.code));
  return out.slice(0, limit).map(({ code, name, level }) => ({ code, name, level }));
}

/** Codes of the source system in the official table (for tests and stats). */
export const conversionCodes = (from: VsicVersion): string[] => [...indexFor(from).names.keys()];
/** 2025 codes that a VSIC 2018 code links to, for /nganh pages. Only exact-code pairs at level 4 or 5. */
export const officialTargetsFor2018 = (code: string): VsicMapping[] => indexFor("2018").byFrom.get(code) ?? [];
/** 2018 codes an official row links a 2025 code to, for /ma-nganh-2025 pages. */
export const officialSourcesFor2025 = (code: string): VsicMapping[] => indexFor("2025").byFrom.get(code) ?? [];

/** Level-5 pair counts per direction, for the explanatory copy on the converter page. */
export function conversionStats(from: VsicVersion) {
  const l5 = dirOf(from).mappings.filter((m) => m.level === 5);
  const codes = new Set(l5.map((m) => m.fromCode));
  const oneToOne = new Set(l5.filter((m) => m.relationship === "one_to_one").map((m) => m.fromCode));
  return { level5Codes: codes.size, level5OneToOne: oneToOne.size };
}
