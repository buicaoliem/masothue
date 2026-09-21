// npm run seo:ctr-report
// CTR by position bucket using masothuedn.com's OWN median as the baseline, and the pages below it.
// A prompt to review title/meta templates at pattern level, not a title generator.
import { bucketOf, ctrFlags, median } from "../lib/gsc/opportunity";
import { pagePath } from "../lib/gsc/parse";
import { loadWindows, NO_DATA_HELP } from "./gsc-lib";

const pct = (r: number) => `${(r * 100).toFixed(2)}%`;

function main() {
  const windows = loadWindows();
  if (windows.length === 0) {
    console.log(NO_DATA_HELP);
    console.log("\nCTR baseline: PENDING.");
    return;
  }
  for (const w of windows) {
    const pages = w.pages.length ? w.pages : w.queryPages.filter((r) => r.page);
    console.log(`\n=========== window ${w.name}: ${pages.length} pages`);
    const { baseline, flags } = ctrFlags(pages);
    for (const b of ["1-3", "4-6", "7-10", "11-20", "21+"] as const) {
      const rows = pages.filter((r) => bucketOf(r.position) === b && r.impressions >= 50);
      console.log(`   position ${b.padEnd(5)} pages ${String(rows.length).padStart(5)}  median CTR ${pct(baseline[b]).padStart(7)}  (median impressions ${Math.round(median(rows.map((r) => r.impressions)))})`);
    }
    // Pattern level: which page TYPES sit below the baseline (so templates, not single titles, get reviewed).
    const type = (p: string) => (/^\/\d{10}/.test(p) ? "company" : /^\/nganh\//.test(p) ? "industry" : /^\/tinh\/[^/]+\/nganh\//.test(p) ? "province x industry" : /^\/tinh\//.test(p) ? "province" : /^\/huong-dan/.test(p) ? "guide" : /^\/cong-cu/.test(p) ? "tool" : p === "/" ? "home" : "other");
    const byType = new Map<string, number[]>();
    for (const f of flags) byType.set(type(f.page), [...(byType.get(type(f.page)) ?? []), f.potentialClicks]);
    console.log("\n-- flagged pages by type (impressions >= 200, position <= 10, CTR below site median):");
    for (const [t, xs] of [...byType].sort((a, b) => b[1].length - a[1].length)) console.log(`   ${t.padEnd(20)} ${String(xs.length).padStart(5)} pages, ~${Math.round(xs.reduce((s, x) => s + x, 0))} potential clicks`);
    console.log("\n-- top 15 pages by potential clicks:");
    for (const f of flags.slice(0, 15)) console.log(`   +${String(f.potentialClicks).padStart(7)} clicks  imp ${String(f.impressions).padStart(6)}  pos ${f.position.toFixed(1)}  CTR ${pct(f.ctr)} vs ${pct(f.siteMedianCtr)}  ${pagePath(f.page)}`);
  }
}

main();
