import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROVINCES } from "@/pipeline/province";
import { getProvinceCompanies, PROVINCE_PAGE_SIZE } from "@/lib/company";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { CompanyList } from "../../components/CompanyList";
import styles from "../../components/site.module.css";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ trang?: string | string[] }>;
};

const findProvince = (slug: string) => PROVINCES.find((p) => p.slug === slug);

/** 1-based page from ?trang=; null for anything that isn't a plain positive integer. */
function parsePage(raw: string | string[] | undefined): number | null {
  if (raw === undefined) return 1;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return /^[1-9]\d{0,5}$/.test(v) ? Number(v) : null;
}

const hubPath = (slug: string, page: number) => (page > 1 ? `/tinh/${slug}?trang=${page}` : `/tinh/${slug}`);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const province = findProvince(slug);
  const page = parsePage((await searchParams).trang);
  if (!province || !page) return {};
  const suffix = page > 1 ? ` - Trang ${page}` : "";
  return {
    title: `Doanh nghiệp tại ${province.displayName}${suffix} | ${SITE_NAME}`,
    description: `Danh sách doanh nghiệp tại ${province.displayName}: tên công ty, mã số thuế và địa chỉ${suffix ? `, trang ${page}` : ""}.`,
    alternates: { canonical: `${SITE_URL}${hubPath(slug, page)}` },
  };
}

export default async function ProvinceHub({ params, searchParams }: Props) {
  const { slug } = await params;
  const province = findProvince(slug);
  const page = parsePage((await searchParams).trang);
  if (!province || !page) notFound();

  const { total, rows } = await getProvinceCompanies(slug, page);
  const pageCount = Math.max(1, Math.ceil(total / PROVINCE_PAGE_SIZE));
  if (page > pageCount) notFound();

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Doanh nghiệp tại {province.displayName}</h1>
      {total === 0 ? (
        <p className={styles.empty}>Chưa có doanh nghiệp nào tại {province.displayName} trong dữ liệu.</p>
      ) : (
        <>
          <p className={styles.lead}>{total.toLocaleString("vi-VN")} doanh nghiệp</p>
          <CompanyList items={rows} />
          {pageCount > 1 && (
            <nav className={styles.pager} aria-label="Phân trang">
              <span className={styles.pagerInfo}>
                Trang {page} / {pageCount}
              </span>
              {page > 1 && (
                <Link href={hubPath(slug, page - 1)} className={styles.pagerLink} rel="prev">
                  Trang trước
                </Link>
              )}
              {page < pageCount && (
                <Link href={hubPath(slug, page + 1)} className={styles.pagerLink} rel="next">
                  Trang sau
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
