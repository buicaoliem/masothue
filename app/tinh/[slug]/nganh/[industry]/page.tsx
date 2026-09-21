import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PROVINCES } from "@/pipeline/province";
import { getCompaniesByIndustry, getIndustryStat, getProvinceIndustryStat, INDUSTRY_LIST_MAX_PAGES } from "@/lib/industry/service";
import { evaluateProvinceIndustrySeoQuality } from "@/lib/seo/industry-quality";
import { buildTaxonomyMetadata } from "@/lib/seo/metadata";
import { industryPath, parseIndustrySlug, parsePage, provinceIndustryPath, provincePath } from "@/lib/seo/urls";
import { LIST_PAGE_SIZE } from "@/lib/taxonomy-data";
import { LinkChips } from "../../../../components/LinkChips";
import { TaxonomyList } from "../../../../components/TaxonomyList";
import styles from "../../../../components/site.module.css";

type Props = {
  params: Promise<{ slug: string; industry: string }>;
  searchParams: Promise<{ trang?: string | string[] }>;
};

const n = (v: number) => v.toLocaleString("vi-VN");

async function resolve(params: Props["params"]) {
  const { slug, industry } = await params;
  const province = PROVINCES.find((p) => p.slug === slug);
  const parsed = parseIndustrySlug(industry);
  if (!province || !parsed) return null;
  const [info, stat] = await Promise.all([getIndustryStat(parsed.code), getProvinceIndustryStat(slug, parsed.code)]);
  if (!info || !stat) return null;
  return { province, info, stat, param: industry };
}

// Province x industry landing pages exist for navigation, but only pages that pass the quality evaluator
// (same call the sitemap uses) are indexable; saturated or thin combinations stay noindex,follow.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const r = await resolve(params);
  const page = parsePage((await searchParams).trang);
  if (!r || !page) return {};
  return buildTaxonomyMetadata({
    title: `Doanh nghiệp ngành ${r.info.name} tại ${r.province.displayName}`,
    description: `Danh sách doanh nghiệp đăng ký ngành ${r.info.code} - ${r.info.name} tại ${r.province.displayName}: mã số thuế, địa chỉ và tình trạng hoạt động.`,
    path: provinceIndustryPath(r.province.slug, r.info.code, r.info.name),
    page,
    index: evaluateProvinceIndustrySeoQuality(r.stat).indexable && page === 1,
  });
}

export default async function ProvinceIndustryHub({ params, searchParams }: Props) {
  const r = await resolve(params);
  const page = parsePage((await searchParams).trang);
  if (!r || !page) notFound();

  const canonical = provinceIndustryPath(r.province.slug, r.info.code, r.info.name);
  if (`/tinh/${r.province.slug}/nganh/${r.param}` !== canonical) permanentRedirect(page > 1 ? `${canonical}?trang=${page}` : canonical);

  const total = r.stat.companyCount;
  const pageCount = Math.min(INDUSTRY_LIST_MAX_PAGES, Math.max(1, Math.ceil(total / LIST_PAGE_SIZE)));
  // Zero results = no such landing page: a real 404, not a thin 200.
  if (total === 0 || page > pageCount) notFound();
  const { rows } = await getCompaniesByIndustry(r.info.code, { provinceSlug: r.province.slug, page });

  const lead =
    r.stat.primaryCount > 0
      ? `${n(total)} doanh nghiệp tại ${r.province.displayName} có đăng ký ngành ${r.info.code}, trong đó ${n(r.stat.primaryCount)} doanh nghiệp có ngành chính là ngành này.`
      : `${n(total)} doanh nghiệp tại ${r.province.displayName} có đăng ký ngành nghề mã ${r.info.code} (nguồn không cho biết đây có phải ngành chính hay không).`;

  return (
    <TaxonomyList
      crumbs={[
        { name: r.province.displayName, path: provincePath(r.province.slug) },
        { name: `${r.info.code} - ${r.info.name}`, path: canonical },
      ]}
      title={`Doanh nghiệp ngành ${r.info.name} tại ${r.province.displayName}`}
      lead={lead}
      total={total}
      rows={rows}
      page={page}
      pageCountOverride={pageCount}
      hrefFor={(p) => (p > 1 ? `${canonical}?trang=${p}` : canonical)}
      emptyText=""
    >
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Xem thêm</h2>
        <LinkChips
          items={[
            { href: provincePath(r.province.slug), label: `Tất cả doanh nghiệp tại ${r.province.displayName}` },
            { href: industryPath(r.info.code, r.info.name), label: `Ngành ${r.info.name} trên toàn quốc` },
          ]}
        />
      </section>
    </TaxonomyList>
  );
}
