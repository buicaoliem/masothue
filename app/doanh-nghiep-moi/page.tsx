import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROVINCES } from "@/pipeline/province";
import { SEO_CONFIG } from "@/lib/seo/config";
import { isTaxonomyPageIndexable } from "@/lib/seo/indexability";
import { buildTaxonomyMetadata } from "@/lib/seo/metadata";
import { newCompaniesPath, parsePage } from "@/lib/seo/urls";
import { getNewCompanies } from "@/lib/taxonomy-data";
import { NewCompaniesView } from "../components/NewCompaniesView";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ trang?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = parsePage((await searchParams).trang);
  if (!page) return {};
  const { total } = await getNewCompanies({ limit: 1 });
  return buildTaxonomyMetadata({
    title: "Doanh nghiệp mới thành lập",
    description: "Doanh nghiệp đăng ký thành lập gần đây nhất trong dữ liệu: mã số thuế, địa chỉ và ngày cấp mã số thuế.",
    path: newCompaniesPath(),
    page,
    index: isTaxonomyPageIndexable({ kind: "new-companies", total, page }),
  });
}

export default async function NewCompanies({ searchParams }: Props) {
  const page = parsePage((await searchParams).trang);
  if (!page) notFound();
  const { total, rows } = await getNewCompanies({ limit: SEO_CONFIG.newCompaniesPageSize, page });
  if (page > 1 && rows.length === 0) notFound();
  return (
    <NewCompaniesView
      title="Doanh nghiệp mới thành lập"
      path={newCompaniesPath()}
      crumbs={[{ name: "Doanh nghiệp mới", path: newCompaniesPath() }]}
      total={total}
      rows={rows}
      page={page}
      provinces={PROVINCES.slice(0, 6).map((p) => ({ slug: p.slug, label: p.displayName }))}
    />
  );
}
