import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findGuide, GUIDES } from "@/lib/guides";
import { articleJsonLd } from "@/lib/seo/jsonld";
import { buildGuideMetadata } from "@/lib/seo/metadata";
import { guidePath } from "@/lib/seo/urls";
import { REL_EXTERNAL_INFO } from "@/lib/relAttrs";
import { Breadcrumb } from "../../components/Breadcrumb";
import { JsonLd } from "../../components/JsonLd";
import styles from "../../components/site.module.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = findGuide((await params).slug);
  return g ? buildGuideMetadata(g) : {};
}

const fmt = (iso: string) => iso.split("-").reverse().join("/");

export default async function GuidePage({ params }: Props) {
  const g = findGuide((await params).slug);
  if (!g) notFound();
  return (
    <main className={styles.page}>
      <Breadcrumb
        items={[
          { name: "Hướng dẫn", path: "/huong-dan" },
          { name: g.title, path: guidePath(g.slug) },
        ]}
      />
      <JsonLd data={articleJsonLd(g)} />
      <article>
        <h1 className={styles.title}>{g.title}</h1>
        {g.answer && (
          <p className={styles.lead} style={{ textAlign: "left", maxWidth: "none", padding: "12px 14px", background: "var(--soft)", borderRadius: 8 }}>
            <strong>Trả lời nhanh:</strong> {g.answer}
          </p>
        )}
        <p className={styles.lead}>{g.intro}</p>
        {g.sections.map((s) => (
          <section key={s.heading} className={styles.section}>
            <h2 className={styles.sectionTitle}>{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {s.table && (
              <table style={{ borderCollapse: "collapse", width: "100%", margin: "12px 0" }}>
                <caption style={{ textAlign: "left", color: "var(--muted)", padding: "4px 0" }}>{s.table.caption}</caption>
                <thead>
                  <tr>
                    {s.table.head.map((h, i) => (
                      <th key={i} scope="col" style={{ textAlign: "left", padding: 8, borderBottom: "2px solid var(--line)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ padding: 8, borderBottom: "1px solid var(--line)", verticalAlign: "top" }}>
                          {cell.startsWith("/") ? <Link href={cell}>{cell}</Link> : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}
        <p className={styles.lead} style={{ marginTop: 24 }}>
          Biên tập bởi ban biên tập masothuedn.com · Cập nhật {fmt(g.modified)} ·{" "}
          <Link href="/chinh-sach-bien-tap">Chính sách biên tập</Link>
        </p>
      </article>
      {g.sources && g.sources.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Nguồn tham khảo</h2>
          <ul>
            {g.sources.map((src) => (
              <li key={src.label}>
                {!src.url ? (
                  src.label
                ) : src.url.startsWith("/") ? (
                  <Link href={src.url}>{src.label}</Link>
                ) : (
                  <a href={src.url} target="_blank" rel={REL_EXTERNAL_INFO}>
                    {src.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Xem thêm</h2>
        <ul>
          {g.related.map((r) => (
            <li key={r.href}>
              <Link href={r.href}>{r.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
