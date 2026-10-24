import Link from "next/link";
import type { Metadata } from "next";
import type { AreaCompany } from "@/lib/area-index";
import { topIndustries } from "@/lib/area-index";
import { statusTone } from "@/lib/company-status";
import type { Crumb } from "@/lib/seo/jsonld";
import { buildTaxonomyMetadata } from "@/lib/seo/metadata";
import { isTaxonomyPageIndexable } from "@/lib/seo/indexability";
import { industryPath } from "@/lib/seo/urls";
import { LIST_PAGE_SIZE } from "@/lib/taxonomy-data";
import { LinkChips } from "./LinkChips";
import { TaxonomyList } from "./TaxonomyList";
import styles from "./site.module.css";

// Shared body of the district (/tinh/<p>/<district>) and ward (/tinh/<p>/<district>/<ward>) hubs. Lists indexable
// company pages only (lib/area-index.ts); every number on the page is counted from that list.

const n = (v: number) => v.toLocaleString("vi-VN");

export function areaHubMetadata(o: { placeLabel: string; path: string; total: number; page: number }): Metadata {
  return buildTaxonomyMetadata({
    title: `Doanh nghiệp tại ${o.placeLabel} - Mã số thuế`,
    description: `Danh sách ${n(o.total)} doanh nghiệp có trụ sở tại ${o.placeLabel}: mã số thuế, địa chỉ đăng ký, ngành nghề chính và tình trạng hoạt động.`,
    path: o.path,
    page: o.page,
    index: isTaxonomyPageIndexable({ kind: "area", total: o.total, page: o.page }),
  });
}

export function AreaHub(props: {
  crumbs: Crumb[];
  placeLabel: string;
  provinceName: string;
  companies: AreaCompany[];
  page: number;
  hrefFor: (page: number) => string;
  /** Sub-areas (wards of a district) or sibling areas (other wards of the same district). */
  areaLinks: { title: string; items: { href: string; label: string }[] } | null;
  upLink: { href: string; label: string } | null;
}) {
  const { companies, page } = props;
  const rows = companies.slice((page - 1) * LIST_PAGE_SIZE, page * LIST_PAGE_SIZE).map((c) => ({ taxCode: c.taxCode, name: c.name, address: c.address }));
  const first = page === 1;
  const active = companies.filter((c) => c.status && statusTone(c.status) === "active").length;
  const industries = first ? topIndustries(companies, 10) : [];
  return (
    <TaxonomyList
      crumbs={props.crumbs}
      title={`Doanh nghiệp tại ${props.placeLabel}`}
      lead={
        <>
          {n(companies.length)} doanh nghiệp có địa chỉ trụ sở tại {props.placeLabel}
          {active > 0 && `, trong đó ${n(active)} đang hoạt động theo dữ liệu đăng ký`}.
        </>
      }
      total={companies.length}
      rows={rows}
      page={page}
      hrefFor={props.hrefFor}
      emptyText={`Chưa có doanh nghiệp nào tại ${props.placeLabel} trong dữ liệu.`}
    >
      {first && (
        <p className={styles.lead}>
          Địa chỉ ghi theo địa giới hành chính trước ngày 01/07/2025, khi còn cấp huyện. Từ ngày đó cấp huyện không còn và
          nhiều xã, phường đã sắp xếp lại; khu vực này nay thuộc {props.provinceName}.
        </p>
      )}
      {first && props.areaLinks && props.areaLinks.items.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{props.areaLinks.title}</h2>
          <LinkChips items={props.areaLinks.items} />
        </section>
      )}
      {industries.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ngành nghề chính phổ biến</h2>
          <LinkChips items={industries.map((i) => ({ href: industryPath(i.code, i.name), label: `${i.code} - ${i.name} (${n(i.count)})` }))} />
        </section>
      )}
      {first && props.upLink && (
        <div className={styles.moreRow}>
          <Link href={props.upLink.href}>{props.upLink.label}</Link>
        </div>
      )}
    </TaxonomyList>
  );
}
