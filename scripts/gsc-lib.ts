import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseGscCsv, type GscRow } from "../lib/gsc/parse";

// Shared loader for the GSC report scripts. Exports live in data/gsc/ (git-ignored): either CSVs directly in that
// folder, or one sub-folder per window (data/gsc/28d, data/gsc/90d). Nothing is fetched and nothing is invented.

export const GSC_DIR = join(process.cwd(), "data", "gsc");

export type Window = { name: string; queries: GscRow[]; pages: GscRow[]; queryPages: GscRow[]; skipped: number; files: string[] };

export function loadWindows(): Window[] {
  if (!existsSync(GSC_DIR)) return [];
  const entries = readdirSync(GSC_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && e.name !== "out").map((e) => e.name);
  const groups: { name: string; dir: string }[] = dirs.length ? dirs.map((d) => ({ name: d, dir: join(GSC_DIR, d) })) : [{ name: "export", dir: GSC_DIR }];
  const windows: Window[] = [];
  for (const g of groups) {
    const w: Window = { name: g.name, queries: [], pages: [], queryPages: [], skipped: 0, files: [] };
    for (const f of readdirSync(g.dir).filter((n) => n.toLowerCase().endsWith(".csv"))) {
      const parsed = parseGscCsv(readFileSync(join(g.dir, f), "utf8"));
      w.skipped += parsed.skipped;
      if (parsed.kind === "unknown") continue;
      w.files.push(`${f} (${parsed.kind}, ${parsed.rows.length} rows)`);
      (parsed.kind === "queries" ? w.queries : parsed.kind === "pages" ? w.pages : w.queryPages).push(...parsed.rows);
    }
    if (w.files.length) windows.push(w);
  }
  return windows;
}

export const NO_DATA_HELP = `No Search Console export found in data/gsc/.
Export from Search Console (Performance -> Search results -> Export -> CSV) for the last 28 days and 90 days:
  data/gsc/28d/Queries.csv   data/gsc/28d/Pages.csv   [data/gsc/28d/QueryPage.csv  (API / Looker Studio export: Query,Page,Clicks,Impressions,CTR,Position)]
  data/gsc/90d/...           (same files)
Nothing is fabricated: baseline metrics stay "pending" until real data is provided.`;

export const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function writeCsv(name: string, header: string[], rows: unknown[][]): string {
  const dir = join(GSC_DIR, "out");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, [header.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n"), "utf8");
  return path;
}

/** Impression-weighted summary of a set of rows. */
export function summarize(rows: readonly GscRow[]) {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const pos = impressions ? rows.reduce((s, r) => s + r.position * r.impressions, 0) / impressions : 0;
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: pos, withClicks: rows.filter((r) => r.clicks > 0).length, withImpressions: rows.length };
}
