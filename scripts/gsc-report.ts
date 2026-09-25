// npm run seo:gsc-report [-- --check-sitemap]
// Mines Search Console exports (data/gsc, see NO_DATA_HELP) into opportunity lists + an intent breakdown.
// Output: console summary + data/gsc/out/{opportunities,intents}-<window>.csv. Never edits titles or content.
import { classifyIntent } from "../lib/gsc/intent";
import { mineOpportunities } from "../lib/gsc/opportunity";
import { pagePath } from "../lib/gsc/parse";
import { loadWindows, NO_DATA_HELP, summarize, writeCsv } from "./gsc-lib";

const pct = (r: number) => `${(r * 100).toFixed(2)}%`;
const CHECK_SITEMAP = process.argv.includes("--check-sitemap");
const BASE = process.env.BASE_URL ?? "https://masothuedn.com";

async function sitemapPaths(section: string): Promise<Set<string>> {
  const res = await fetch(`${BASE}/sitemaps/${section}`);
  return new Set([...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => pagePath(m[1])));
}

async function main() {
  const windows = loadWindows();
  if (windows.length === 0) {
    console.log(NO_DATA_HELP);
    console.log("\nBaseline: PENDING (no Search Console data available).");
    return;
  }
  for (const w of windows) {
    console.log(`\n=========== window ${w.name}  (${w.files.join("; ")}${w.skipped ? `; ${w.skipped} unreadable rows skipped` : ""})`);
    const q = summarize(w.queries.length ? w.queries : w.queryPages);
    const p = summarize(w.pages.length ? w.pages : w.queryPages.filter((r) => r.page));
    console.log(`baseline  clicks ${q.clicks}  impressions ${q.impressions}  CTR ${pct(q.ctr)}  avg position ${q.position.toFixed(1)}`);
    console.log(`          queries with clicks ${q.withClicks}/${q.withImpressions}   pages with clicks ${p.withClicks}/${p.withImpressions}`);

    const source = w.queryPages.length ? w.queryPages : [...w.queries];
    const { opportunities, baseline } = mineOpportunities(source);
    console.log("site median CTR by position bucket:", JSON.stringify(Object.fromEntries(Object.entries(baseline).map(([k, v]) => [k, pct(v)]))));
    if (!w.queryPages.length) console.log("(no query+page export: cannibalization and no-landing-page checks need it)");

    for (const kind of ["striking-distance", "low-ctr", "zero-click-page", "long-tail", "cannibalization", "no-landing-page"] as const) {
      const list = opportunities.filter((o) => o.kind === kind).slice(0, 10);
      console.log(`\n-- ${kind}: ${opportunities.filter((o) => o.kind === kind).length} found, top ${list.length}`);
      for (const o of list) console.log(`   score ${String(o.score).padStart(8)}  imp ${String(o.impressions).padStart(6)}  pos ${o.position.toFixed(1).padStart(5)}  ${o.intent ?? ""}  ${o.query ?? ""}  ${o.page ?? ""}`);
    }

    const intents = new Map<string, { clicks: number; impressions: number; queries: number }>();
    for (const r of w.queries.length ? w.queries : w.queryPages) {
      if (!r.query) continue;
      const i = classifyIntent(r.query);
      const a = intents.get(i) ?? { clicks: 0, impressions: 0, queries: 0 };
      a.clicks += r.clicks;
      a.impressions += r.impressions;
      a.queries++;
      intents.set(i, a);
    }
    console.log("\n-- intents");
    for (const [i, a] of [...intents].sort((x, y) => y[1].impressions - x[1].impressions)) console.log(`   ${i.padEnd(16)} queries ${String(a.queries).padStart(6)}  impressions ${String(a.impressions).padStart(8)}  clicks ${String(a.clicks).padStart(6)}  CTR ${pct(a.impressions ? a.clicks / a.impressions : 0)}`);

    const out = writeCsv(`opportunities-${w.name}.csv`, ["kind", "query", "intent", "page", "clicks", "impressions", "ctr", "position", "score", "note"], opportunities.map((o) => [o.kind, o.query, o.intent, o.page, o.clicks, o.impressions, o.ctr.toFixed(4), o.position.toFixed(1), o.score, o.note]));
    writeCsv(`intents-${w.name}.csv`, ["query", "intent", "page", "clicks", "impressions", "ctr", "position"], source.filter((r) => r.query).map((r) => [r.query, classifyIntent(r.query!), r.page ? pagePath(r.page) : "", r.clicks, r.impressions, r.ctr.toFixed(4), r.position.toFixed(1)]));
    console.log(`\nwritten: ${out}`);

    if (CHECK_SITEMAP) {
      // Taxonomy pages that get impressions but are noindex (absent from the sitemap): candidates to REVIEW, never auto-index.
      const [inds, pairs] = await Promise.all([sitemapPaths("industries.xml"), sitemapPaths("province-industries-0.xml")]);
      const pages = new Map<string, number>();
      for (const r of w.pages.length ? w.pages : w.queryPages) if (r.page) pages.set(pagePath(r.page), (pages.get(pagePath(r.page)) ?? 0) + r.impressions);
      const demand = [...pages].filter(([p, imp]) => (/^\/nganh\//.test(p) && !inds.has(p)) || (/^\/tinh\/[^/]+\/nganh\//.test(p) && !pairs.has(p)) ? imp > 0 : false).sort((a, b) => b[1] - a[1]).slice(0, 20);
      console.log(`\n-- noindex taxonomy receiving impressions: ${demand.length} (review quality rules; demand alone is not a reason to index)`);
      for (const [p, imp] of demand) console.log(`   ${String(imp).padStart(6)}  ${p}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
