import { SEO_CONFIG } from "@/lib/seo/config";
import {
  buildSitemapIndex,
  companySitemapUrl,
  countSitemapPages,
  provinceIndustrySitemapUrl,
  SITEMAP_SECTIONS,
  sectionSitemapUrl,
  xmlResponse,
} from "@/lib/sitemap";
import { listIndexableProvinceIndustries } from "@/lib/industry/seo";

// Read the store on every request; never query the DB at build time.
export const dynamic = "force-dynamic";


/** Sitemap index: one child per section, then one child per 50,000 listable companies. */
export async function GET() {
  const [pages, pairs] = await Promise.all([
    countSitemapPages(),
    listIndexableProvinceIndustries(),
  ]);
  // Shard counts are discovered from the data, never hardcoded.
  const pairShards = Math.max(1, Math.ceil(pairs.length / SEO_CONFIG.sitemapMaxUrls));
  const locs = [
    ...SITEMAP_SECTIONS.map(sectionSitemapUrl),
    ...Array.from({ length: pairShards }, (_, i) => provinceIndustrySitemapUrl(i)),
    ...Array.from({ length: pages }, (_, i) => companySitemapUrl(i)),
  ];
  return xmlResponse(buildSitemapIndex(locs));
}
