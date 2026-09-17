import { getListedProvinceSlugs } from "@/lib/company";
import { INDEXABLE_MIN_PROFILES } from "@/lib/directory";
import { getGroupCountsNationwide, getIndexableDirectoryPaths, getProvinceSlugsWithAnyProfile } from "@/lib/directory-web";
import { getSitemapPage, xmlEscape, xmlResponse } from "@/lib/sitemap";
import { SITE_URL } from "@/lib/site";
import { ENABLED_TOOLS } from "@/lib/tools/registry";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ file: string }> };

const urlset = (entries: string[]) =>
  xmlResponse(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`);

/** Child sitemaps: /sitemaps/pages.xml (home + tools + non-empty province hubs) and /sitemaps/companies-{n}.xml. */
export async function GET(_req: Request, { params }: Props) {
  const { file } = await params;

  if (file === "pages.xml") {
    const [slugs, directoryPaths, directoryProvinceSlugs, groupCounts] = await Promise.all([
      getListedProvinceSlugs(),
      getIndexableDirectoryPaths(),
      getProvinceSlugsWithAnyProfile(),
      getGroupCountsNationwide(),
    ]);
    const indexableGroupSlugs = [...groupCounts.entries()].filter(([, n]) => n >= INDEXABLE_MIN_PROFILES).map(([slug]) => slug);
    const urls = [
      `${SITE_URL}/`,
      `${SITE_URL}/cong-cu`,
      `${SITE_URL}/gioi-thieu`,
      `${SITE_URL}/dieu-khoan`,
      `${SITE_URL}/chinh-sach-bao-mat`,
      ...ENABLED_TOOLS.map((t) => `${SITE_URL}/cong-cu/${t.slug}`),
      ...slugs.sort().map((slug) => `${SITE_URL}/tinh/${slug}`),
      ...(directoryProvinceSlugs.length > 0 ? [`${SITE_URL}/danh-ba`] : []),
      ...directoryProvinceSlugs.sort().map((slug) => `${SITE_URL}/danh-ba/tinh/${slug}`),
      ...indexableGroupSlugs.sort().map((slug) => `${SITE_URL}/danh-ba/${slug}`),
      ...directoryPaths
        .sort((a, b) => `${a.groupSlug}/${a.provinceSlug}`.localeCompare(`${b.groupSlug}/${b.provinceSlug}`))
        .map((d) => `${SITE_URL}/danh-ba/${d.groupSlug}/${d.provinceSlug}`),
    ];
    return urlset(urls.map((u) => `  <url><loc>${xmlEscape(u)}</loc></url>`));
  }

  const m = /^companies-(\d{1,6})\.xml$/.exec(file);
  if (!m) return new Response("Not Found", { status: 404 });

  const page = Number(m[1]);
  const rows = await getSitemapPage(page);
  if (rows.length === 0 && page > 0) return new Response("Not Found", { status: 404 });

  return urlset(
    rows.map(
      (r) =>
        `  <url><loc>${xmlEscape(`${SITE_URL}/${r.taxCode}`)}</loc><lastmod>${r.updatedAt.toISOString()}</lastmod></url>`,
    ),
  );
}
