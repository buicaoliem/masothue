import Link from "next/link";
import { SEO_CONFIG } from "@/lib/seo/config";
import type { Crumb } from "@/lib/seo/jsonld";
import { newCompaniesPath } from "@/lib/seo/urls";
import type { ListedRow } from "@/lib/taxonomy-data";
import { Breadcrumb } from "./Breadcrumb";
import { LinkChips } from "./LinkChips";
import { Pager } from "./Pager";
import styles from "./site.module.css";

const fmt = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

export function NewCompaniesView(props: {
  title: string;
  path: string;
  crumbs: Crumb[];
  total: number;
  rows: (ListedRow & { activeDate: Date | null })[];
  page: number;
  provinces?: { slug: string; label: string }[];
}) {
  const pageCount = Math.max(1, Math.ceil(props.total / SEO_CONFIG.newCompaniesPageSize));
  return (
    <main className={styles.page}>
      <Breadcrumb items={props.crumbs} />
      <h1 className={styles.title}>{props.title}</h1>
      <p className={styles.lead}>Sắp xếp theo ngày cấp mã số thuế mới nhất trong dữ liệu (không phải ngày hệ thống nhập).</p>
      {props.provinces && (
        <LinkChips items={props.provinces.map((p) => ({ href: newCompaniesPath(p.slug), label: p.label }))} />
      )}
      {props.rows.length === 0 ? (
        <p className={styles.empty}>Chưa có dữ liệu doanh nghiệp mới.</p>
      ) : (
        <ul className={styles.list} style={{ marginTop: 20 }}>
          {props.rows.map((c) => (
            <li key={c.taxCode}>
              <Link href={`/${c.taxCode}`} className={styles.card}>
                <span className={styles.cardName}>{c.name}</span>
                <span className={styles.cardMeta}>
                  MST {c.taxCode}
                  {c.activeDate ? ` · Cấp ngày ${fmt(c.activeDate)}` : ""}
                </span>
                <span className={styles.cardMeta}>{c.address}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager page={props.page} pageCount={pageCount} hrefFor={(p) => (p > 1 ? `${props.path}?trang=${p}` : props.path)} />
    </main>
  );
}
