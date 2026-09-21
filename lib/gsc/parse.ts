// Parser for Google Search Console CSV exports (Performance report -> Export). Header names differ by UI
// language (English / Vietnamese), so columns are matched on accent-stripped keywords. Nothing here invents data:
// rows that cannot be read are counted and reported, not guessed.

export type GscRow = {
  query?: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctr: number; // 0..1
  position: number;
};

export type ParseResult = { rows: GscRow[]; skipped: number; kind: "queries" | "pages" | "query-page" | "unknown" };

export const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();

/** RFC-4180-ish CSV line splitter (quotes, doubled quotes). GSC exports are UTF-8, comma separated. */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((c) => c !== "")) rows.push(row);
  }
  return rows;
}

/** "12,3%" / "1.5%" / "0.015" -> 0.123 / 0.015 / 0.015. */
export function parseCtr(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const pct = s.endsWith("%");
  const n = Number(s.replace("%", "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return pct ? n / 100 : n;
}

/** Numbers as exported: "1,234" (thousands) or "12.5" / "12,5" (decimal); GSC uses one form per locale. */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return null;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ""));
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, "").replace(",", "."));
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const HEADERS = {
  query: ["top queries", "truy van", "query", "queries"],
  page: ["top pages", "trang hang dau", "page", "pages", "trang"],
  clicks: ["clicks", "so lan nhap", "luot nhap"],
  impressions: ["impressions", "luot hien thi"],
  ctr: ["ctr", "ty le nhap"],
  position: ["position", "vi tri"],
} as const;

function findCol(header: string[], keys: readonly string[]): number {
  const h = header.map(strip);
  return h.findIndex((c) => keys.some((k) => c === k || c.startsWith(k)));
}

export function parseGscCsv(text: string): ParseResult {
  const table = splitCsv(text);
  if (table.length < 2) return { rows: [], skipped: 0, kind: "unknown" };
  const header = table[0];
  const iQuery = findCol(header, HEADERS.query);
  const iPage = findCol(header, HEADERS.page);
  const iClicks = findCol(header, HEADERS.clicks);
  const iImp = findCol(header, HEADERS.impressions);
  const iCtr = findCol(header, HEADERS.ctr);
  const iPos = findCol(header, HEADERS.position);
  if (iClicks < 0 || iImp < 0 || (iQuery < 0 && iPage < 0)) return { rows: [], skipped: table.length - 1, kind: "unknown" };

  const rows: GscRow[] = [];
  let skipped = 0;
  for (const cells of table.slice(1)) {
    const clicks = parseNumber(cells[iClicks] ?? "");
    const impressions = parseNumber(cells[iImp] ?? "");
    const ctr = iCtr >= 0 ? parseCtr(cells[iCtr] ?? "") : impressions ? (clicks ?? 0) / impressions : null;
    const position = iPos >= 0 ? parseNumber(cells[iPos] ?? "") : null;
    if (clicks === null || impressions === null || ctr === null || position === null) {
      skipped++;
      continue;
    }
    rows.push({
      ...(iQuery >= 0 ? { query: (cells[iQuery] ?? "").trim() } : {}),
      ...(iPage >= 0 ? { page: (cells[iPage] ?? "").trim() } : {}),
      clicks,
      impressions,
      ctr,
      position,
    });
  }
  const kind = iQuery >= 0 && iPage >= 0 ? "query-page" : iQuery >= 0 ? "queries" : "pages";
  return { rows, skipped, kind };
}

/** "https://www.masothuedn.com/nganh/4102-x?utm=1" -> "/nganh/4102-x" (path only, no query/fragment). */
export function pagePath(url: string): string {
  try {
    return new URL(url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return url.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  }
}
