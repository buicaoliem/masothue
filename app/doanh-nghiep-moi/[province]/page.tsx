import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROVINCES } from "@/pipeline/province";
import { SEO_CONFIG } from "@/lib/seo/config";
import { isTaxonomyPageIndexable } from "@/lib/seo/indexability";
import { buildTaxonomyMetadata } from "@/lib/seo/metadata";
import { newCompaniesPath, parsePage } from "@/lib/seo/urls";
import { getNewCompanies } from "@/lib/taxonomy-data";
import { NewCompaniesView } from "../../components/NewCompaniesView";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ province: string }>; searchParams: Promise<{ trang?: string | string[] }> };

const find = (slug: string) => PROVINCES.find((p) => p.slug === slug);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const province = find((await params).province);
  const page = parsePage((await searchParams).trang);
  if (!province || !page) return {};
  const { total } = await getNewCompanies({ provinceSlug: province.slug, limit: 1 });
  return buildTaxonomyMetadata({
    title: `Doanh nghiệp mới thành lập tại ${province.displayName}`,
    description: `Doanh nghiệp đăng ký thành lập gần đây tại ${province.displayName}: mã số thuế, địa chỉ và ngày cấp mã số thuế.`,
    path: newCompaniesPath(province.slug),
    page,
    index: isTaxonomyPageIndexable({ kind: "new-companies", total, page }),
  });
}

export default async function NewCompaniesInProvince({ params, searchParams }: Props) {
  const province = find((await params).province);
  const page = parsePage((await searchParams).trang);
  if (!province || !page) notFound();
  const { total, rows } = await getNewCompanies({ provinceSlug: province.slug, limit: SEO_CONFIG.newCompaniesPageSize, page });
  if (page > 1 && rows.length === 0) notFound();
  return (
    <NewCompaniesView
      title={`Doanh nghiệp mới thành lập tại ${province.displayName}`}
      path={newCompaniesPath(province.slug)}
      crumbs={[
        { name: "Doanh nghiệp mới", path: newCompaniesPath() },
        { name: province.displayName, path: newCompaniesPath(province.slug) },
      ]}
      total={total}
      rows={rows}
      page={page}
    />
  );
}
