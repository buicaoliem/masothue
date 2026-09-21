import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findGuide, GUIDES } from "@/lib/guides";
import { articleJsonLd } from "@/lib/seo/jsonld";
import { buildGuideMetadata } from "@/lib/seo/metadata";
import { guidePath } from "@/lib/seo/urls";
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
        <p className={styles.lead}>{g.intro}</p>
        {g.sections.map((s) => (
          <section key={s.heading} className={styles.section}>
            <h2 className={styles.sectionTitle}>{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
        <p className={styles.lead} style={{ marginTop: 24 }}>
          Biên tập bởi ban biên tập masothuedn.com · Cập nhật {fmt(g.modified)} ·{" "}
          <Link href="/chinh-sach-bien-tap">Chính sách biên tập</Link>
        </p>
      </article>
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
