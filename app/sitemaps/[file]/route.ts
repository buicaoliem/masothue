import { getSitemapPage, xmlEscape, xmlResponse } from "@/lib/sitemap";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ file: string }> };

/** Child sitemap /sitemaps/companies-{n}.xml. */
export async function GET(_req: Request, { params }: Props) {
  const { file } = await params;
  const m = /^companies-(\d{1,6})\.xml$/.exec(file);
  if (!m) return new Response("Not Found", { status: 404 });

  const page = Number(m[1]);
  const rows = await getSitemapPage(page);
  if (rows.length === 0 && page > 0) return new Response("Not Found", { status: 404 });

  const urls = rows.map(
    (r) =>
      `  <url><loc>${xmlEscape(`${SITE_URL}/${r.taxCode}`)}</loc><lastmod>${r.updatedAt.toISOString()}</lastmod></url>`,
  );
  return xmlResponse(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`);
}
