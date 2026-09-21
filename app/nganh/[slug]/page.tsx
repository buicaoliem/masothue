import type { Metadata } from "next";
import { CLASSIFICATION_LABEL, CLASSIFICATION_NOTE } from "@/lib/industry/classification";
import { notFound, permanentRedirect } from "next/navigation";
import { PROVINCES } from "@/pipeline/province";
import {
  getCompaniesByIndustry,
  getIndustryContext,
  listProvinceStatsForIndustry,
  getIndustryStat,
  getRelatedIndustries,
  INDUSTRY_LIST_MAX_PAGES,
} from "@/lib/industry/service";
import { evaluateIndustrySeoQuality, evaluateProvinceIndustrySeoQuality } from "@/lib/seo/industry-quality";
import { buildIndustryMetadata } from "@/lib/seo/metadata";
import { industryPath, parseIndustrySlug, parsePage, provinceIndustryPath, provincePath } from "@/lib/seo/urls";
import { LIST_PAGE_SIZE } from "@/lib/taxonomy-data";
import { officialTargetsFor2018 } from "@/lib/vsic/convert";
import { VsicMappingTable } from "../../ma-nganh-2025/VsicMappingTable";
import { LinkChips } from "../../components/LinkChips";
import { TaxonomyList } from "../../components/TaxonomyList";
import styles from "../../components/site.module.css";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ trang?: string | string[] }> };

const n = (v: number) => v.toLocaleString("vi-VN");

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const parsed = parseIndustrySlug((await params).slug);
  const page = parsePage((await searchParams).trang);
  if (!parsed || !page) return {};
  const stat = await getIndustryStat(parsed.code);
  if (!stat) return {};
  // Same evaluator as the sitemap. Page 2+ stays crawlable but noindex.
  const quality = evaluateIndustrySeoQuality(stat, await getIndustryContext());
  return buildIndustryMetadata(
    { path: industryPath(stat.code, stat.name), code: stat.code, name: stat.name },
    page,
    quality.indexable && page === 1,
  );
}

export default async function IndustryHub({ params, searchParams }: Props) {
  const param = (await params).slug;
  const parsed = parseIndustrySlug(param);
  const page = parsePage((await searchParams).trang);
  if (!parsed || !page) notFound();
  const stat = await getIndustryStat(parsed.code);
  if (!stat) notFound();

  // The code is the identity; a wrong or missing name slug redirects to the canonical path.
  const canonical = industryPath(stat.code, stat.name);
  if (`/nganh/${param}` !== canonical) permanentRedirect(page > 1 ? `${canonical}?trang=${page}` : canonical);

  const pageCount = Math.min(INDUSTRY_LIST_MAX_PAGES, Math.max(1, Math.ceil(stat.companyCount / LIST_PAGE_SIZE)));
  if (page > pageCount) notFound();
  const { rows } = await getCompaniesByIndustry(stat.code, { page });

  const [distribution, related] =
    page === 1 ? await Promise.all([listProvinceStatsForIndustry(stat.code), getRelatedIndustries(stat.code)]) : [[], []];
  const vsic2025 = page === 1 ? officialTargetsFor2018(stat.code) : [];
  const provinceName = (slug: string) => PROVINCES.find((p) => p.slug === slug)?.displayName ?? slug;

  // Only link to landing pages that pass the quality rule; the others fall back to the province hub.
  const distributionLinks = distribution.map((d) => ({
    href: evaluateProvinceIndustrySeoQuality(d).indexable ? provinceIndustryPath(d.provinceSlug, stat.code, stat.name) : provincePath(d.provinceSlug),
    label: `${provinceName(d.provinceSlug)} (${n(d.companyCount)})`,
  }));

  // Semantics: "registered" = holds this code among its registered industries; "primary" only where a source says so.
  const lead =
    stat.primaryCount > 0
      ? `Mã ngành ${stat.code}: ${stat.name}. ${n(stat.companyCount)} doanh nghiệp có đăng ký ngành này, trong đó ${n(stat.primaryCount)} doanh nghiệp có ngành chính là ${stat.name}.`
      : `Mã ngành ${stat.code}: ${stat.name}. ${n(stat.companyCount)} doanh nghiệp có đăng ký ngành nghề này trong dữ liệu của chúng tôi (nguồn không cho biết đây có phải ngành chính hay không).`;

  return (
    <TaxonomyList
      crumbs={[
        { name: "Ngành nghề", path: "/nganh" },
        { name: `${stat.code} - ${stat.name}`, path: canonical },
      ]}
      title={`Doanh nghiệp ngành ${stat.code} - ${stat.name}`}
      lead={lead}
      total={stat.companyCount}
      rows={rows}
      page={page}
      pageCountOverride={pageCount}
      hrefFor={(p) => (p > 1 ? `${canonical}?trang=${p}` : canonical)}
      emptyText="Chưa có doanh nghiệp nào trong ngành này."
    >
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Số liệu</h2>
        <ul>
          <li>Doanh nghiệp có đăng ký ngành này: {n(stat.companyCount)}</li>
          {stat.primaryCount > 0 && <li>Doanh nghiệp có ngành chính là ngành này: {n(stat.primaryCount)}</li>}
          <li>Số tỉnh, thành phố có doanh nghiệp đăng ký: {n(stat.provinceCount)}</li>
          <li>Hệ thống ngành: {CLASSIFICATION_LABEL}</li>
        </ul>
        <p style={{ color: "var(--muted)" }}>{CLASSIFICATION_NOTE}</p>
      </section>
      {vsic2025.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Xem mã tương ứng trong VSIC 2025</h2>
          <VsicMappingTable mappings={vsic2025} caption={`Mã VSIC 2025 tương ứng với ${stat.code} (VSIC 2018) theo bảng chuyển đổi chính thức`} />
          {(vsic2025.length > 1 || vsic2025.some((m) => m.relationship !== "one_to_one" || m.flagged)) && (
            <p style={{ color: "var(--muted)" }}>Cần đối chiếu hoạt động thực tế để chọn mã phù hợp; chúng tôi không chọn hộ.</p>
          )}
        </section>
      )}
      {distributionLinks.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Phân bố theo tỉnh, thành phố</h2>
          <LinkChips items={distributionLinks} />
        </section>
      )}
      {related.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ngành liên quan</h2>
          <LinkChips items={related.map((r) => ({ href: industryPath(r.code, r.name), label: `${r.code} - ${r.name}` }))} />
        </section>
      )}
    </TaxonomyList>
  );
}
