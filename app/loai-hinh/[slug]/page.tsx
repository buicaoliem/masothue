import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isTaxonomyPageIndexable } from "@/lib/seo/indexability";
import { buildTaxonomyMetadata } from "@/lib/seo/metadata";
import { legalFormPath, parsePage } from "@/lib/seo/urls";
import { countCompanies, legalTypesForSlug, listCompanies, LIST_PAGE_SIZE } from "@/lib/taxonomy-data";
import { TaxonomyList } from "../../components/TaxonomyList";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ trang?: string | string[] }> };

async function resolve(slug: string) {
  const types = await legalTypesForSlug(slug);
  return types.length > 0 ? { label: types[0], where: { legalType: { in: types } } } : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = parsePage((await searchParams).trang);
  const form = await resolve(slug);
  if (!form || !page) return {};
  const total = await countCompanies(form.where);
  return buildTaxonomyMetadata({
    title: `Mã số thuế ${form.label}`,
    description: `Danh sách doanh nghiệp loại hình ${form.label}: mã số thuế, địa chỉ và tình trạng hoạt động.`,
    path: legalFormPath(slug),
    page,
    index: isTaxonomyPageIndexable({ kind: "legal-form", total, page }),
  });
}

export default async function LegalFormHub({ params, searchParams }: Props) {
  const { slug } = await params;
  const page = parsePage((await searchParams).trang);
  const form = await resolve(slug);
  if (!form || !page) notFound();

  const { total, rows } = await listCompanies(form.where, page);
  if (total === 0 || page > Math.ceil(total / LIST_PAGE_SIZE)) notFound();

  return (
    <TaxonomyList
      crumbs={[
        { name: "Loại hình", path: "/loai-hinh" },
        { name: form.label, path: legalFormPath(slug) },
      ]}
      title={`Doanh nghiệp loại hình ${form.label}`}
      lead={`${total.toLocaleString("vi-VN")} doanh nghiệp loại hình ${form.label} trong dữ liệu của chúng tôi.`}
      total={total}
      rows={rows}
      page={page}
      hrefFor={(p) => (p > 1 ? `${legalFormPath(slug)}?trang=${p}` : legalFormPath(slug))}
      emptyText=""
    />
  );
}
