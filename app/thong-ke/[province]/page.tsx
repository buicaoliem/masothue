import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROVINCES } from "@/pipeline/province";
import { listProvinceIndustryStats } from "@/lib/industry/service";
import { isTaxonomyPageIndexable } from "@/lib/seo/indexability";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { newCompaniesPath, provincePath, statsPath } from "@/lib/seo/urls";
import { SITE_NAME } from "@/lib/site";
import { getDataAsOf, getNewCompanies, getStatusBreakdown, listProvinceLegalForms } from "@/lib/taxonomy-data";
import { StatsView } from "../../components/StatsView";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ province: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).province;
  const province = PROVINCES.find((p) => p.slug === slug);
  if (!province) return {};
  const { total } = await getStatusBreakdown(province.slug);
  return buildPageMetadata({
    title: `Thống kê doanh nghiệp tại ${province.displayName} | ${SITE_NAME}`,
    description: `Thống kê doanh nghiệp tại ${province.displayName} trong dữ liệu masothuedn.com: số lượng theo tình trạng và ngành phổ biến.`,
    path: statsPath(province.slug),
    index: isTaxonomyPageIndexable({ kind: "province", total }),
  });
}

export default async function ProvinceStats({ params }: Props) {
  const slug = (await params).province;
  const province = PROVINCES.find((p) => p.slug === slug);
  if (!province) notFound();
  const [breakdown, stats, dataAsOf, legalForms, fresh] = await Promise.all([
    getStatusBreakdown(province.slug),
    listProvinceIndustryStats(province.slug),
    getDataAsOf(),
    listProvinceLegalForms(province.slug),
    getNewCompanies({ provinceSlug: province.slug, limit: 8, withTotal: false }),
  ]);
  const registeredTop = stats.slice(0, 15).map((s) => ({ code: s.code, name: s.name, count: s.companyCount }));
  const primaryTop = stats
    .filter((s) => s.primaryCount > 0)
    .sort((a, b) => b.primaryCount - a.primaryCount || a.code.localeCompare(b.code))
    .slice(0, 15)
    .map((s) => ({ code: s.code, name: s.name, count: s.primaryCount }));
  if (breakdown.total === 0) notFound();
  return (
    <StatsView
      title={`Thống kê doanh nghiệp tại ${province.displayName}`}
      crumbs={[
        { name: "Thống kê", path: "/thong-ke" },
        { name: province.displayName, path: statsPath(province.slug) },
      ]}
      scopeLabel={`tại ${province.displayName}`}
      breakdown={breakdown}
      registeredTop={registeredTop}
      primaryTop={primaryTop}
      dataAsOf={dataAsOf}
      legalForms={legalForms}
      newCompanies={{ rows: fresh.rows, moreHref: newCompaniesPath(province.slug) }}
      links={[
        { href: provincePath(province.slug), label: `Danh sách doanh nghiệp tại ${province.displayName}` },
        { href: "/thong-ke/doanh-nghiep-viet-nam", label: "Thống kê toàn quốc" },
      ]}
    />
  );
}
