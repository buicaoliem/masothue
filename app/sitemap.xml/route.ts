import { companySitemapUrl, countSitemapPages, pagesSitemapUrl, xmlResponse } from "@/lib/sitemap";

// Read the store on every request; never query the DB at build time.
export const dynamic = "force-dynamic";

/** Sitemap index: home + province hubs, then one child sitemap per 50,000 listable companies. */
export async function GET() {
  const pages = await countSitemapPages();
  const locs = [pagesSitemapUrl, ...Array.from({ length: pages }, (_, i) => companySitemapUrl(i))];
  const entries = locs.map((loc) => `  <sitemap><loc>${loc}</loc></sitemap>`);
  return xmlResponse(
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</sitemapindex>`,
  );
}
