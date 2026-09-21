import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isTaxonomyPageIndexable } from "@/lib/seo/indexability";
import { buildTaxonomyMetadata } from "@/lib/seo/metadata";
import { findStatusPage } from "@/lib/seo/taxonomy";
import { parsePage, statusPath } from "@/lib/seo/urls";
import { countCompanies, listCompanies, LIST_PAGE_SIZE } from "@/lib/taxonomy-data";
import { TaxonomyList } from "../../components/TaxonomyList";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ trang?: string | string[] }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const status = findStatusPage((await params).slug);
  const page = parsePage((await searchParams).trang);
  if (!status || !page) return {};
  const total = await countCompanies(status.where);
  return buildTaxonomyMetadata({
    title: status.title,
    description: status.description,
    path: statusPath(status.slug),
    page,
    index: isTaxonomyPageIndexable({ kind: "status", total, page }),
  });
}

export default async function StatusHub({ params, searchParams }: Props) {
  const status = findStatusPage((await params).slug);
  const page = parsePage((await searchParams).trang);
  if (!status || !page) notFound();

  const { total, rows } = await listCompanies(status.where, page);
  if (page > Math.max(1, Math.ceil(total / LIST_PAGE_SIZE))) notFound();

  return (
    <TaxonomyList
      crumbs={[
        { name: "Tình trạng", path: "/trang-thai" },
        { name: status.label, path: statusPath(status.slug) },
      ]}
      title={status.title}
      lead={`${status.description} ${total.toLocaleString("vi-VN")} doanh nghiệp trong dữ liệu của chúng tôi. Tình trạng có thể đã thay đổi sau thời điểm nguồn công bố.`}
      total={total}
      rows={rows}
      page={page}
      hrefFor={(p) => (p > 1 ? `${statusPath(status.slug)}?trang=${p}` : statusPath(status.slug))}
      emptyText="Chưa có doanh nghiệp nào ở tình trạng này trong dữ liệu."
    />
  );
}
