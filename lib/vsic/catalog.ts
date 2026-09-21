// VSIC 2025 catalog (Quyết định 36/2025/QĐ-TTg). Identity is version + code: the same code can mean something else in VSIC 2018,
// so nothing here is keyed by code alone. This module never touches IndustryCatalog (company data, VSIC 2018).
import catalogJson from "@/data/vsic/vsic2025-catalog.json";
import { slugify } from "@/lib/seo/slug";
import { foldVi } from "./normalize";
import type { VsicEntry, VsicLevel, VsicVersion } from "./types";

const ENTRIES = catalogJson as VsicEntry[];
const BY_KEY = new Map<string, VsicEntry>(ENTRIES.map((e) => [entryKey(e.version, e.code), e]));
const CHILDREN = new Map<string, VsicEntry[]>();
for (const e of ENTRIES) if (e.parentCode) (CHILDREN.get(e.parentCode) ?? CHILDREN.set(e.parentCode, []).get(e.parentCode)!).push(e);

export function entryKey(version: VsicVersion, code: string): string {
  return `${version}:${code}`;
}

export const LEVEL_LABEL: Record<VsicLevel, string> = { 1: "Ngành cấp 1", 2: "Ngành cấp 2", 3: "Ngành cấp 3", 4: "Ngành cấp 4", 5: "Ngành cấp 5" };

export const allVsic2025 = (): readonly VsicEntry[] => ENTRIES;
export const getVsic2025 = (code: string): VsicEntry | undefined => BY_KEY.get(entryKey("2025", code.toUpperCase()));
export const getVsicEntry = (version: VsicVersion, code: string): VsicEntry | undefined => BY_KEY.get(entryKey(version, code.toUpperCase()));
export const childrenOf = (code: string): readonly VsicEntry[] => CHILDREN.get(code) ?? [];

export function ancestorsOf(code: string): VsicEntry[] {
  const out: VsicEntry[] = [];
  let cur = getVsic2025(code)?.parentCode;
  while (cur) {
    const e = getVsic2025(cur);
    if (!e) break;
    out.unshift(e);
    cur = e.parentCode;
  }
  return out;
}

// ---- URLs -------------------------------------------------------------------------------------------------------------

export const VSIC_2025_ROOT = "/ma-nganh-2025";
export const vsic2025Slug = (code: string, name: string) => `${code.toLowerCase()}-${slugify(name)}`;
export const vsic2025Path = (e: Pick<VsicEntry, "code" | "name">) => `${VSIC_2025_ROOT}/${vsic2025Slug(e.code, e.name)}`;

/** "62190-lap-trinh-may-tinh-khac" or "k-hoat-dong-vien-thong" -> code; null when the shape is wrong. */
export function parseVsic2025Slug(param: string): { code: string; slug: string } | null {
  const m = /^([a-z]|\d{2,5})(?:-([a-z0-9-]*))?$/.exec(param);
  return m ? { code: m[1].toUpperCase(), slug: m[2] ?? "" } : null;
}

// ---- Search -----------------------------------------------------------------------------------------------------------

const FOLDED = ENTRIES.map((e) => ({ e, name: foldVi(e.name) }));

/** Code prefix search when the query looks like a code; otherwise every word must appear in the (diacritic-free) name. */
export function searchVsic2025(query: string, limit = 50): VsicEntry[] {
  const q = foldVi(query);
  if (!q) return [];
  if (/^[a-z]$|^\d{1,5}$/.test(q)) {
    const c = q.toUpperCase();
    return ENTRIES.filter((e) => e.code.startsWith(c)).slice(0, limit);
  }
  const words = q.split(" ");
  const hits = FOLDED.filter((f) => words.every((w) => f.name.includes(w)));
  // exact phrase first, then shallower levels, then document order
  hits.sort((a, b) => Number(b.name.includes(q)) - Number(a.name.includes(q)) || a.e.level - b.e.level);
  return hits.slice(0, limit).map((f) => f.e);
}

// ---- Indexability -----------------------------------------------------------------------------------------------------

export type Vsic2025Content = { d?: string[]; x?: string[] };

export const VSIC_MIN_CONTENT_CHARS = 120;

/**
 * The ONE decision about indexing a /ma-nganh-2025/{code} page. Used by page metadata and by the sitemap.
 * A page is worth indexing when the official text says something beyond the name: enough description text, or an
 * exclusion note. A 4-digit code whose only child is a 5-digit code with the same name duplicates that child, so it is not indexed.
 */
export function isVsic2025PageIndexable(entry: VsicEntry, content: Vsic2025Content | undefined, children: readonly VsicEntry[] = childrenOf(entry.code)): boolean {
  if (entry.version !== "2025") return false;
  const chars = (content?.d ?? []).join(" ").length;
  const hasExclusion = (content?.x?.length ?? 0) > 0;
  if (chars < VSIC_MIN_CONTENT_CHARS && !hasExclusion) return false;
  if (children.length === 1 && children[0].name === entry.name) return false;
  return true;
}
