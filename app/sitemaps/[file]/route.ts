import { getListedProvinceSlugs } from "@/lib/company";
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
    const slugs = await getListedProvinceSlugs();
    const urls = [
      `${SITE_URL}/`,
      `${SITE_URL}/cong-cu`,
      ...ENABLED_TOOLS.map((t) => `${SITE_URL}/cong-cu/${t.slug}`),
      ...slugs.sort().map((slug) => `${SITE_URL}/tinh/${slug}`),
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
