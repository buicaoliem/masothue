import { slugify } from "@/lib/seo/slug";

// Centralized industry normalization. Every path that writes an industry (open-data import,
// legacy backfill, future providers) goes through here, so the taxonomy only ever sees
// well-formed VSIC codes and cleaned names. Nothing is inferred: a value that does not parse is dropped.

export type IndustryEntry = { code: string; name: string };

const CODE_RE = /^\d{2,5}$/;

/**
 * VSIC code as a string of 2-5 digits, or null. Strings keep their leading zeros ("0210").
 * A JS number has already lost its leading zeros (an Excel cell), so it is left-padded to the
 * 4-digit level, the level the sources publish; 5-digit codes starting with 0 must arrive as strings.
 */
export function normalizeIndustryCode(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  let s: string;
  if (typeof v === "number") {
    if (!Number.isInteger(v) || v <= 0) return null;
    s = String(v);
    if (s.length < 4) s = s.padStart(4, "0");
  } else {
    s = String(v).normalize("NFC").replace(/\s+/g, "").replace(/\.0+$/, "");
  }
  return CODE_RE.test(s) ? s : null;
}

/** NFC, collapsed whitespace, no trailing punctuation, no source-side "-(detail)" suffix; null when empty. */
export function normalizeIndustryName(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v)
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .split(/\s*-+\s*(?:\(|Chi tiết)/i)[0]
    .replace(/[\s\-;:,.]+$/, "")
    .replace(/^[\s\-;:,.]+/, "")
    .trim();
  return s === "" ? null : s;
}

export function normalizeIndustry(code: unknown, name: unknown): IndustryEntry | null {
  const c = normalizeIndustryCode(code);
  const n = normalizeIndustryName(name);
  return c && n ? { code: c, name: n } : null;
}

/** Splits "1621: A-(x);1622: B" (or comma-separated, as Quảng Ngãi does) only where a new "code:" starts, since names themselves contain ";" and ",". */
export function parseIndustryListDetailed(raw: unknown): { entries: IndustryEntry[]; malformed: number; duplicates: number } {
  if (raw === null || raw === undefined) return { entries: [], malformed: 0, duplicates: 0 };
  const text = String(raw).normalize("NFC").replace(/\s+/g, " ").trim();
  if (!text) return { entries: [], malformed: 0, duplicates: 0 };
  const out: IndustryEntry[] = [];
  const seen = new Set<string>();
  let malformed = 0;
  let duplicates = 0;
  for (const part of text.split(/[;,]\s*(?=\d{2,5}\s*:)/)) {
    const m = /^(\d{2,5})\s*:\s*(.*)$/.exec(part.trim());
    const entry = m ? normalizeIndustry(m[1], m[2]) : null;
    if (!entry) malformed++;
    else if (seen.has(entry.code)) duplicates++;
    else {
      seen.add(entry.code);
      out.push(entry);
    }
  }
  return { entries: out, malformed, duplicates };
}

export const parseIndustryList = (raw: unknown): IndustryEntry[] => parseIndustryListDetailed(raw).entries;

/** Codes only: valid, de-duplicated, sorted (deterministic storage order). */
export function normalizeCodeSet(codes: readonly unknown[]): string[] {
  const set = new Set<string>();
  for (const c of codes) {
    const n = normalizeIndustryCode(c);
    if (n) set.add(n);
  }
  return [...set].sort();
}

/** "6201 - Lập trình máy vi tính" (the legacy Company.mainIndustry cache format) -> entry. */
export function parseLegacyMainIndustry(text: string | null | undefined): IndustryEntry | null {
  const m = /^(\d{2,5}) - (.+)$/.exec(text ?? "");
  return m ? normalizeIndustry(m[1], m[2]) : null;
}

export const formatMainIndustry = (e: IndustryEntry) => `${e.code} - ${e.name}`;

/** Presentation slug; the code is the identity, so a changed name never changes which industry this is. */
export const industrySlugFor = (e: IndustryEntry) => `${e.code}-${slugify(e.name)}`;

export type ClassifiedIndustries = { primary: IndustryEntry | null; others: IndustryEntry[] };

/** One primary at most; duplicates by code collapse; the primary never also appears in `others`. */
export function classifyIndustries(primary: IndustryEntry | null, all: IndustryEntry[]): ClassifiedIndustries {
  const seen = new Set<string>(primary ? [primary.code] : []);
  const others: IndustryEntry[] = [];
  for (const e of all) {
    if (!seen.has(e.code)) {
      seen.add(e.code);
      others.push(e);
    }
  }
  return { primary, others };
}
