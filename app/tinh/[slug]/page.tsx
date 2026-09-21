import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROVINCES } from "@/pipeline/province";
import { isTaxonomyPageIndexable } from "@/lib/seo/indexability";
import { buildProvinceMetadata } from "@/lib/seo/metadata";
import { STATUS_PAGES } from "@/lib/seo/taxonomy";
import { industryPath, newCompaniesPath, parsePage, provinceIndustryPath, provincePath, statusPath } from "@/lib/seo/urls";
import { listIndexableProvinceIndustries } from "@/lib/industry/seo";
import { countCompanies, getNewCompanies, getStatusBreakdown, listCompanies, LIST_PAGE_SIZE } from "@/lib/taxonomy-data";
import { CompanyList } from "../../components/CompanyList";
import { LinkChips } from "../../components/LinkChips";
import { TaxonomyList } from "../../components/TaxonomyList";
import styles from "../../components/site.module.css";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ trang?: string | string[] }>;
};

const findProvince = (slug: string) => PROVINCES.find((p) => p.slug === slug);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const province = findProvince(slug);
  const page = parsePage((await searchParams).trang);
  if (!province || !page) return {};
  const total = await countCompanies({ provinceSlug: slug });
  return buildProvinceMetadata(province, page, isTaxonomyPageIndexable({ kind: "province", total, page }));
}

export default async function ProvinceHub({ params, searchParams }: Props) {
  const { slug } = await params;
  const province = findProvince(slug);
  const page = parsePage((await searchParams).trang);
  if (!province || !page) notFound();

  const { total, rows } = await listCompanies({ provinceSlug: slug }, page);
  if (page > Math.max(1, Math.ceil(total / LIST_PAGE_SIZE))) notFound();

  const first = page === 1;
  const [breakdown, industries, fresh] = first
    ? await Promise.all([
        getStatusBreakdown(slug),
        listIndexableProvinceIndustries(slug).then((l) => l.sort((a, b) => b.companyCount - a.companyCount).slice(0, 12)),
        getNewCompanies({ provinceSlug: slug, limit: 6 }),
      ])
    : [null, [], { total: 0, rows: [] }];

  return (
    <TaxonomyList
      crumbs={[{ name: province.displayName, path: provincePath(slug) }]}
      title={`Mã số thuế doanh nghiệp tại ${province.displayName}`}
      lead={`${total.toLocaleString("vi-VN")} doanh nghiệp tại ${province.displayName} trong dữ liệu của chúng tôi.`}
      total={total}
      rows={rows}
      page={page}
      hrefFor={(p) => provincePath(slug, p)}
      emptyText={`Chưa có doanh nghiệp nào tại ${province.displayName} trong dữ liệu.`}
    >
      {breakdown && breakdown.total > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Tình trạng hoạt động</h2>
          <p className={styles.lead}>
            {[
              [breakdown.active, STATUS_PAGES[0]],
              [breakdown.suspended, STATUS_PAGES[1]],
              [breakdown.stopped, STATUS_PAGES[2]],
            ]
              .filter(([n]) => (n as number) > 0)
              .map(([n, s]) => `${(n as number).toLocaleString("vi-VN")} ${(s as (typeof STATUS_PAGES)[number]).label.toLowerCase()}`)
              .join(" · ")}
          </p>
          <LinkChips items={STATUS_PAGES.map((s) => ({ href: statusPath(s.slug), label: s.label }))} />
        </section>
      )}
      {fresh.rows.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Doanh nghiệp mới tại {province.displayName}</h2>
          <CompanyList items={fresh.rows} />
          <div className={styles.moreRow}>
            <Link href={newCompaniesPath(slug)}>Xem tất cả doanh nghiệp mới tại {province.displayName}</Link>
          </div>
        </section>
      )}
      {industries.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ngành phổ biến tại {province.displayName}</h2>
          <LinkChips items={industries.map((i) => ({ href: provinceIndustryPath(slug, i.code, i.name), label: `${i.code} - ${i.name} (${i.companyCount.toLocaleString("vi-VN")})` }))} />
          <p className={styles.lead} style={{ marginTop: 12 }}>
            Xem thêm <Link href={industryPath(industries[0].code, industries[0].name)}>doanh nghiệp ngành {industries[0].name} trên toàn quốc</Link>.
          </p>
        </section>
      )}
    </TaxonomyList>
  );
}
