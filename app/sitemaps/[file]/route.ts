import { INDEXABLE_MIN_PROFILES } from "@/lib/directory";
import { listIndexableIndustries, listIndexableProvinceIndustries } from "@/lib/industry/seo";
import { getGroupCountsNationwide, getIndexableDirectoryPaths, getProvinceSlugsWithAnyProfile } from "@/lib/directory-web";
import { GUIDES } from "@/lib/guides";
import { isTaxonomyPageIndexable } from "@/lib/seo/indexability";
import { SEO_CONFIG } from "@/lib/seo/config";
import { STATUS_PAGES } from "@/lib/seo/taxonomy";
import { guidePath, industryPath, legalFormPath, newCompaniesPath, provinceIndustryPath, provincePath, statsPath, statusPath } from "@/lib/seo/urls";
import {
  buildUrlset,
  companyLastmod,
  getSitemapPage,
  SITEMAP_SECTIONS,
  toSitemapUrls,
  xmlResponse,
  type SitemapSection,
} from "@/lib/sitemap";
import { SITE_URL } from "@/lib/site";
import {
  countCompanies,
  getNewCompanies,
  listLegalForms,
  listProvinceCounts,
} from "@/lib/taxonomy-data";
import { ENABLED_TOOLS } from "@/lib/tools/registry";
import { TAX_STATUS_DETAIL_PAGES, taxStatusPath } from "@/lib/tax-status/catalog";
import { VSIC_2025_ROOT, vsic2025Path } from "@/lib/vsic/catalog";
import { listIndexableVsic2025 } from "@/lib/vsic/content";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ file: string }> };

// Every entry goes through isTaxonomyPageIndexable / isCompanyProfileIndexable-equivalent queries,
// the same rules the pages use for their robots meta, so the sitemap never lists a noindex page.
async function pathsFor(section: SitemapSection): Promise<string[]> {
  switch (section) {
    case "static":
      return [
        "/", "/gioi-thieu", "/lien-he", "/nguon-du-lieu", "/phuong-phap-du-lieu", "/chinh-sach-bien-tap",
        "/dieu-khoan", "/chinh-sach-bao-mat", "/huong-dan", "/thong-ke", "/thong-ke/doanh-nghiep-viet-nam",
        "/nganh", "/loai-hinh", "/trang-thai",
      ];
    case "tools":
      return ["/cong-cu", ...ENABLED_TOOLS.map((t) => `/cong-cu/${t.slug}`)];
    case "guides":
      return [...GUIDES.map((g) => guidePath(g.slug)), ...TAX_STATUS_DETAIL_PAGES.map((t) => taxStatusPath(t.detailSlug!))];
    case "vsic-2025":
      // Same rule as the page robots meta: isVsic2025PageIndexable via listIndexableVsic2025().
      return [VSIC_2025_ROOT, ...listIndexableVsic2025().map(vsic2025Path)];
    case "provinces": {
      const counts = await listProvinceCounts();
      const paths: string[] = [];
      for (const { provinceSlug, total } of counts.sort((a, b) => a.provinceSlug.localeCompare(b.provinceSlug))) {
        if (!isTaxonomyPageIndexable({ kind: "province", total })) continue;
        paths.push(provincePath(provinceSlug), statsPath(provinceSlug));
        const fresh = await getNewCompanies({ provinceSlug, limit: 1 });
        if (isTaxonomyPageIndexable({ kind: "new-companies", total: fresh.total })) paths.push(newCompaniesPath(provinceSlug));
      }
      return paths;
    }
    case "industries": {
      // Quality evaluator (lib/seo/industry-quality.ts), the same rule the page metadata uses.
      return (await listIndexableIndustries()).map((i) => industryPath(i.code, i.name));
    }
    case "taxonomy": {
      const [forms, statusTotals, fresh] = await Promise.all([
        listLegalForms(),
        Promise.all(STATUS_PAGES.map((s) => countCompanies(s.where))),
        getNewCompanies({ limit: 1 }),
      ]);
      return [
        ...forms.filter((f) => isTaxonomyPageIndexable({ kind: "legal-form", total: f.total })).map((f) => legalFormPath(f.slug)),
        ...STATUS_PAGES.filter((_, i) => isTaxonomyPageIndexable({ kind: "status", total: statusTotals[i] })).map((s) => statusPath(s.slug)),
        ...(isTaxonomyPageIndexable({ kind: "new-companies", total: fresh.total }) ? [newCompaniesPath()] : []),
      ];
    }
    case "directory": {
      const [paths, provinceSlugs, groupCounts] = await Promise.all([
        getIndexableDirectoryPaths(),
        getProvinceSlugsWithAnyProfile(),
        getGroupCountsNationwide(),
      ]);
      const groups = [...groupCounts.entries()].filter(([, n]) => n >= INDEXABLE_MIN_PROFILES).map(([slug]) => slug);
      return [
        ...(provinceSlugs.length > 0 ? ["/danh-ba"] : []),
        ...[...provinceSlugs].sort().map((s) => `/danh-ba/tinh/${s}`),
        ...groups.sort().map((s) => `/danh-ba/${s}`),
        ...paths.sort((a, b) => `${a.groupSlug}/${a.provinceSlug}`.localeCompare(`${b.groupSlug}/${b.provinceSlug}`)).map((d) => `/danh-ba/${d.groupSlug}/${d.provinceSlug}`),
      ];
    }
  }
}

/** Child sitemaps: /sitemaps/{section}.xml and /sitemaps/companies-{n}.xml (one per 50,000 listable companies). */
export async function GET(_req: Request, { params }: Props) {
  const { file } = await params;

  const section = SITEMAP_SECTIONS.find((s) => `${s}.xml` === file);
  if (section) {
    const urls = toSitemapUrls(await pathsFor(section));
    return xmlResponse(buildUrlset(urls.map((loc) => ({ loc }))));
  }

  const pi = /^province-industries-(\d{1,4})\.xml$/.exec(file);
  if (pi) {
    // Deterministic order (province, code) + fixed shard size: a URL never moves between shards unless the data changes.
    const shard = Number(pi[1]);
    const slice = (await listIndexableProvinceIndustries()).slice(shard * SEO_CONFIG.sitemapMaxUrls, (shard + 1) * SEO_CONFIG.sitemapMaxUrls);
    if (slice.length === 0 && shard > 0) return new Response("Not Found", { status: 404 });
    const urls = toSitemapUrls(slice.map((p) => provinceIndustryPath(p.provinceSlug, p.code, p.name)));
    return xmlResponse(buildUrlset(urls.map((loc) => ({ loc }))));
  }

  const m = /^companies-(\d{1,6})\.xml$/.exec(file);
  if (!m) return new Response("Not Found", { status: 404 });

  const page = Number(m[1]);
  const rows = await getSitemapPage(page);
  if (rows.length === 0 && page > 0) return new Response("Not Found", { status: 404 });

  // lastmod follows real data changes (see companyLastmod), never the build or Prisma's updatedAt.
  return xmlResponse(buildUrlset(rows.map((r) => ({ loc: `${SITE_URL}/${r.taxCode}`, lastmod: companyLastmod(r) }))));
}
