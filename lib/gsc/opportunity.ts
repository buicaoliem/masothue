import { classifyIntent, INTENT_RELEVANCE, type Intent } from "./intent";
import { pagePath, type GscRow } from "./parse";

// Opportunity mining over GSC rows. Everything is relative to masothuedn.com's own numbers (its median CTR per
// position bucket), never an internet-wide CTR curve.

export const OPPORTUNITY_CONFIG = {
  minImpressions: 50, // ignore noise below this within the export window
  strikingPosition: [4, 15] as const,
  cannibalPages: 2, // a query served by >= this many URLs with real impressions
  cannibalMinShare: 0.15, // ...each holding at least this share of the query's impressions
  longTailMaxClicks: 1,
};

export type Bucket = "1-3" | "4-6" | "7-10" | "11-20" | "21+";
export const bucketOf = (pos: number): Bucket => (pos <= 3.5 ? "1-3" : pos <= 6.5 ? "4-6" : pos <= 10.5 ? "7-10" : pos <= 20.5 ? "11-20" : "21+");

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Site's own median CTR per position bucket (rows with impressions >= minImpressions only). */
export function ctrBaseline(rows: readonly GscRow[], minImpressions = OPPORTUNITY_CONFIG.minImpressions): Record<Bucket, number> {
  const by: Record<Bucket, number[]> = { "1-3": [], "4-6": [], "7-10": [], "11-20": [], "21+": [] };
  for (const r of rows) if (r.impressions >= minImpressions) by[bucketOf(r.position)].push(r.ctr);
  return Object.fromEntries((Object.keys(by) as Bucket[]).map((b) => [b, median(by[b])])) as Record<Bucket, number>;
}

export type Opportunity = {
  kind: "striking-distance" | "low-ctr" | "zero-click-page" | "long-tail" | "cannibalization" | "no-landing-page";
  query?: string;
  page?: string;
  intent?: Intent;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  /** Rough priority: potential clicks weighted by business relevance. Comparable within one report only. */
  score: number;
  note: string;
};

const round = (n: number) => Math.round(n * 100) / 100;

/** A query is served by a fitting landing page when GSC shows it on a route that matches its intent. */
export function expectedLanding(intent: Intent): RegExp | null {
  switch (intent) {
    case "tax-code lookup":
    case "company lookup":
      return /^\/\d{10}(-\d{3})?$/;
    case "company status":
      return /^\/(trang-thai|huong-dan|\d{10})/;
    case "industry":
      return /^\/(nganh|tinh\/[^/]+\/nganh|huong-dan)/;
    case "province":
      return /^\/(tinh|thong-ke|doanh-nghiep-moi)/;
    case "tool/calculator":
      return /^\/cong-cu/;
    case "tax/accounting":
    case "legal/how-to":
      return /^\/(huong-dan|cong-cu)/;
    default:
      return null;
  }
}

export function mineOpportunities(
  queryPages: readonly GscRow[],
  cfg = OPPORTUNITY_CONFIG,
): { opportunities: Opportunity[]; baseline: Record<Bucket, number> } {
  const baseline = ctrBaseline(queryPages, cfg.minImpressions);
  const out: Opportunity[] = [];
  const weight = (q: string | undefined) => INTENT_RELEVANCE[q ? classifyIntent(q) : "other"];

  for (const r of queryPages) {
    if (r.impressions < cfg.minImpressions) continue;
    const intent = r.query ? classifyIntent(r.query) : undefined;
    const base = { query: r.query, page: r.page ? pagePath(r.page) : undefined, intent, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position };
    const [lo, hi] = cfg.strikingPosition;
    if (r.position >= lo && r.position <= hi) {
      out.push({ ...base, kind: "striking-distance", score: round(r.impressions * (1 / r.position) * weight(r.query)), note: `position ${r.position.toFixed(1)}: one push can reach page 1` });
    }
    if (r.position <= 10) {
      const expected = baseline[bucketOf(r.position)];
      if (expected > 0 && r.ctr < expected) {
        out.push({ ...base, kind: "low-ctr", score: round(r.impressions * (expected - r.ctr) * weight(r.query)), note: `CTR ${(r.ctr * 100).toFixed(1)}% vs site median ${(expected * 100).toFixed(1)}% at this position` });
      }
    }
  }

  // Pages with impressions and no clicks.
  const byPage = new Map<string, { clicks: number; impressions: number; posSum: number; n: number }>();
  for (const r of queryPages) {
    if (!r.page) continue;
    const p = pagePath(r.page);
    const a = byPage.get(p) ?? { clicks: 0, impressions: 0, posSum: 0, n: 0 };
    a.clicks += r.clicks;
    a.impressions += r.impressions;
    a.posSum += r.position * r.impressions;
    a.n += r.impressions;
    byPage.set(p, a);
  }
  for (const [page, a] of byPage) {
    if (a.clicks === 0 && a.impressions >= cfg.minImpressions) {
      const position = a.posSum / a.n;
      out.push({ kind: "zero-click-page", page, clicks: 0, impressions: a.impressions, ctr: 0, position, score: round(a.impressions / Math.max(1, position)), note: "impressions but no clicks: review title/meta and intent fit" });
    }
  }

  // Long tail: many distinct low-click variants of the same 3-word stem.
  const stems = new Map<string, GscRow[]>();
  for (const r of queryPages) {
    if (!r.query || r.clicks > cfg.longTailMaxClicks) continue;
    const stem = r.query.split(/\s+/).slice(0, 3).join(" ").toLowerCase();
    stems.set(stem, [...(stems.get(stem) ?? []), r]);
  }
  for (const [stem, rs] of stems) {
    const variants = new Set(rs.map((r) => r.query)).size;
    if (variants >= 5) {
      const imp = rs.reduce((s, r) => s + r.impressions, 0);
      out.push({ kind: "long-tail", query: `${stem} …`, intent: classifyIntent(stem), clicks: rs.reduce((s, r) => s + r.clicks, 0), impressions: imp, ctr: 0, position: median(rs.map((r) => r.position)), score: round(imp * 0.1 * weight(stem)), note: `${variants} variants with <=${cfg.longTailMaxClicks} click: check whether a template covers them` });
    }
  }

  // Cannibalization: one query, several URLs each with a real share of impressions.
  const byQuery = new Map<string, GscRow[]>();
  for (const r of queryPages) if (r.query && r.page) byQuery.set(r.query, [...(byQuery.get(r.query) ?? []), r]);
  for (const [query, rs] of byQuery) {
    const total = rs.reduce((s, r) => s + r.impressions, 0);
    if (total < cfg.minImpressions) continue;
    const strong = rs.filter((r) => r.impressions / total >= cfg.cannibalMinShare);
    if (new Set(strong.map((r) => pagePath(r.page!))).size >= cfg.cannibalPages) {
      out.push({ kind: "cannibalization", query, intent: classifyIntent(query), clicks: rs.reduce((s, r) => s + r.clicks, 0), impressions: total, ctr: 0, position: median(rs.map((r) => r.position)), score: round(total * weight(query) * 0.2), note: `served by ${strong.map((r) => pagePath(r.page!)).join(" | ")}` });
    }
  }

  // Queries whose best URL does not match what the intent needs: content gap.
  for (const [query, rs] of byQuery) {
    const total = rs.reduce((s, r) => s + r.impressions, 0);
    if (total < cfg.minImpressions) continue;
    const intent = classifyIntent(query);
    const want = expectedLanding(intent);
    if (!want) continue;
    const best = [...rs].sort((a, b) => b.impressions - a.impressions)[0];
    if (!want.test(pagePath(best.page!))) {
      out.push({ kind: "no-landing-page", query, page: pagePath(best.page!), intent, clicks: best.clicks, impressions: total, ctr: best.ctr, position: best.position, score: round(total * weight(query) * 0.5), note: `intent "${intent}" but the top URL is ${pagePath(best.page!)}` });
    }
  }

  return { opportunities: out.sort((a, b) => b.score - a.score), baseline };
}

export type CtrFlag = { page: string; impressions: number; clicks: number; ctr: number; position: number; bucket: Bucket; siteMedianCtr: number; potentialClicks: number };

/** Pages with enough impressions and a good position whose CTR is below the site's own median for that bucket. */
export function ctrFlags(pages: readonly GscRow[], minImpressions = 200): { baseline: Record<Bucket, number>; flags: CtrFlag[] } {
  const baseline = ctrBaseline(pages, OPPORTUNITY_CONFIG.minImpressions);
  const flags: CtrFlag[] = [];
  for (const r of pages) {
    if (!r.page || r.impressions < minImpressions || r.position > 10.5) continue;
    const bucket = bucketOf(r.position);
    const med = baseline[bucket];
    if (med > 0 && r.ctr < med) flags.push({ page: pagePath(r.page), impressions: r.impressions, clicks: r.clicks, ctr: r.ctr, position: r.position, bucket, siteMedianCtr: med, potentialClicks: round(r.impressions * (med - r.ctr)) });
  }
  return { baseline, flags: flags.sort((a, b) => b.potentialClicks - a.potentialClicks) };
}
