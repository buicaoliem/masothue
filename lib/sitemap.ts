import { prisma } from "@/pipeline/db";
import { SITE_URL } from "@/lib/site";
import { listableWhere } from "@/lib/company";
import { SEO_CONFIG } from "@/lib/seo/config";

// Protocol limit is 50,000 URLs per sitemap file.
export const SITEMAP_PAGE_SIZE = SEO_CONFIG.sitemapMaxUrls;

// Child sitemaps, one per section, so Search Console reports coverage per page type.
export const SITEMAP_SECTIONS = ["static", "tools", "guides", "provinces", "industries", "taxonomy", "directory"] as const;
export type SitemapSection = (typeof SITEMAP_SECTIONS)[number];

export const sectionSitemapUrl = (section: SitemapSection) => `${SITE_URL}/sitemaps/${section}.xml`;
export const provinceIndustrySitemapUrl = (shard: number) => `${SITE_URL}/sitemaps/province-industries-${shard}.xml`;
export const companySitemapUrl = (page: number) => `${SITE_URL}/sitemaps/companies-${page}.xml`;

export async function countSitemapPages(): Promise<number> {
  const total = await prisma.company.count({ where: await listableWhere() });
  return Math.max(1, Math.ceil(total / SITEMAP_PAGE_SIZE));
}

export async function getSitemapPage(page: number) {
  return prisma.company.findMany({
    where: await listableWhere(),
    select: { taxCode: true, dataUpdatedAt: true, dataAsOf: true, lastEnrichedAt: true },
    orderBy: { taxCode: "asc" },
    skip: page * SITEMAP_PAGE_SIZE,
    take: SITEMAP_PAGE_SIZE,
  });
}

type Freshness = { dataUpdatedAt: Date | null; dataAsOf: Date | null; lastEnrichedAt: Date | null };

/**
 * lastmod = when the page content last meaningfully changed: the record's own change time, else the
 * source dataset date, else the last sync. Prisma's updatedAt is deliberately NOT used (technical
 * writes move it). null = omit <lastmod> rather than guess.
 */
export function companyLastmod(c: Freshness): string | undefined {
  return (c.dataUpdatedAt ?? c.dataAsOf ?? c.lastEnrichedAt)?.toISOString();
}

const XML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
export const xmlEscape = (s: string) => s.replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch]);

/** Paths are site-relative and must be query-free; duplicates are dropped and the list is capped at the protocol limit. */
export function toSitemapUrls(paths: string[], max = SITEMAP_PAGE_SIZE): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paths) {
    if (p.includes("?") || p.includes("#")) throw new Error(`Sitemap path must not carry a query or fragment: ${p}`);
    const url = `${SITE_URL}${p}`;
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  if (out.length > max) throw new Error(`Sitemap section exceeds ${max} URLs (${out.length}); shard it`);
  return out;
}

export function buildUrlset(entries: { loc: string; lastmod?: string }[]): string {
  const rows = entries.map((e) => `  <url><loc>${xmlEscape(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`);
  return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>`;
}

export function buildSitemapIndex(locs: string[]): string {
  const rows = locs.map((loc) => `  <sitemap><loc>${xmlEscape(loc)}</loc></sitemap>`);
  return `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</sitemapindex>`;
}

export function xmlResponse(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
