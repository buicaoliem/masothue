import Link from "next/link";
import { STATUS_PAGES } from "@/lib/seo/taxonomy";
import { legalFormPath, statusPath } from "@/lib/seo/urls";
import type { StatusBreakdown } from "@/lib/taxonomy-data";
import { industryPath } from "@/lib/seo/urls";
import type { Crumb } from "@/lib/seo/jsonld";
import { Breadcrumb } from "./Breadcrumb";
import styles from "./site.module.css";

const n = (v: number) => v.toLocaleString("vi-VN");
const fmt = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

export type IndustryTop = { code: string; name: string; count: number };

function IndustryList({ items, suffix }: { items: IndustryTop[]; suffix: string }) {
  return (
    <ul className={styles.list}>
      {items.map((i) => (
        <li key={i.code}>
          <Link href={industryPath(i.code, i.name)} className={styles.card}>
            <span className={styles.cardName}>
              {i.code} - {i.name}
            </span>
            <span className={styles.cardMeta}>
              {n(i.count)} {suffix}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Statistics page body. Every figure is a live count over listable companies; nothing is estimated. */
export function StatsView(props: {
  title: string;
  crumbs: Crumb[];
  scopeLabel: string;
  breakdown: StatusBreakdown;
  /** Industries held by the most companies as a REGISTERED industry (any storage). */
  registeredTop: IndustryTop[];
  /** Industries that are the EXPLICIT primary industry of the most companies. Registered != primary. */
  primaryTop: IndustryTop[];
  dataAsOf: Date | null;
  legalForms?: { slug: string; label: string; total: number }[];
  /** Newest registrations in scope (real registration dates), with the hub that lists more. */
  newCompanies?: { rows: { taxCode: string; name: string; activeDate: Date | null }[]; moreHref: string };
  links?: { href: string; label: string }[];
}) {
  const { breakdown: b } = props;
  const counts = [b.active, b.suspended, b.stopped];
  return (
    <main className={styles.page}>
      <Breadcrumb items={props.crumbs} />
      <h1 className={styles.title}>{props.title}</h1>
      <p className={styles.lead}>
        Số liệu tính trên các hồ sơ doanh nghiệp hiện có trong dữ liệu của masothuedn.com {props.scopeLabel}. Đây không phải
        tổng số doanh nghiệp thực tế của cả nước.
        {props.dataAsOf ? ` Ngày dữ liệu nguồn mới nhất: ${fmt(props.dataAsOf)}.` : ""}
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tổng quan</h2>
        <table style={{ margin: "0 auto", borderCollapse: "collapse", minWidth: 280 }}>
          <caption className={styles.lead}>Số doanh nghiệp theo tình trạng hoạt động</caption>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: "left", padding: 6 }}>Tình trạng</th>
              <th scope="col" style={{ textAlign: "right", padding: 6 }}>Số doanh nghiệp</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" style={{ textAlign: "left", padding: 6 }}>Tất cả</th>
              <td style={{ textAlign: "right", padding: 6 }}>{n(b.total)}</td>
            </tr>
            {STATUS_PAGES.map((s, i) => (
              <tr key={s.slug}>
                <th scope="row" style={{ textAlign: "left", padding: 6 }}>
                  <Link href={statusPath(s.slug)}>{s.label}</Link>
                </th>
                <td style={{ textAlign: "right", padding: 6 }}>{n(counts[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {props.legalForms && props.legalForms.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Loại hình doanh nghiệp phổ biến</h2>
          <ul className={styles.list}>
            {props.legalForms.map((f) => (
              <li key={f.slug}>
                <Link href={legalFormPath(f.slug)} className={styles.card}>
                  <span className={styles.cardName}>{f.label}</span>
                  <span className={styles.cardMeta}>{n(f.total)} doanh nghiệp</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {props.newCompanies && props.newCompanies.rows.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Doanh nghiệp có ngày cấp mã số thuế gần đây nhất</h2>
          <ul className={styles.list}>
            {props.newCompanies.rows.map((c) => (
              <li key={c.taxCode}>
                <Link href={`/${c.taxCode}`} className={styles.card}>
                  <span className={styles.cardName}>{c.name}</span>
                  <span className={styles.cardMeta}>
                    MST {c.taxCode}
                    {c.activeDate ? ` · Cấp ngày ${fmt(c.activeDate)}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className={styles.moreRow}>
            <Link href={props.newCompanies.moreHref}>Xem tất cả doanh nghiệp mới</Link>
          </div>
        </section>
      )}

      {props.registeredTop.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ngành có nhiều doanh nghiệp đăng ký nhất</h2>
          <p className={styles.lead}>Doanh nghiệp có đăng ký ngành này trong hồ sơ, không nhất thiết là ngành hoạt động chính.</p>
          <IndustryList items={props.registeredTop} suffix="doanh nghiệp có đăng ký" />
        </section>
      )}
      {props.primaryTop.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ngành được nhiều doanh nghiệp lấy làm ngành chính nhất</h2>
          <p className={styles.lead}>Chỉ tính doanh nghiệp mà nguồn dữ liệu nêu rõ ngành chính.</p>
          <IndustryList items={props.primaryTop} suffix="doanh nghiệp có ngành chính" />
        </section>
      )}

      {props.links && props.links.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Xem thêm</h2>
          <ul>
            {props.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
