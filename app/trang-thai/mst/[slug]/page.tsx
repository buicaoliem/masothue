import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { describeLegalSource, legalVerifiedAt } from "@/lib/legal/sources";
import { articleJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { REL_EXTERNAL_INFO } from "@/lib/relAttrs";
import { SITE_NAME } from "@/lib/site";
import { findTaxStatusBySlug, TAX_STATUS_DETAIL_PAGES, taxStatusPath } from "@/lib/tax-status/catalog";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { JsonLd } from "../../../components/JsonLd";
import styles from "../../../components/site.module.css";
import v from "../../../ma-nganh-2025/vsic.module.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => TAX_STATUS_DETAIL_PAGES.map((s) => ({ slug: s.detailSlug! }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = findTaxStatusBySlug((await params).slug);
  if (!s) return {};
  return buildPageMetadata({
    title: `Trạng thái mã số thuế ${s.code}: ${s.officialName} | ${SITE_NAME}`,
    description: `Trạng thái mã số thuế ${s.code} (${s.officialName}) theo Thông tư 90/2026/TT-BTC: ý nghĩa, các lý do chi tiết và những điều nên kiểm tra.`,
    path: taxStatusPath(s.detailSlug!),
    index: true,
    type: "article",
  });
}

export default async function TaxStatusDetail({ params }: Props) {
  const s = findTaxStatusBySlug((await params).slug);
  if (!s || s.effectiveStatus !== "in-force") notFound();
  const path = taxStatusPath(s.detailSlug!);
  const src = describeLegalSource(s.legalSource);
  return (
    <main className={styles.page}>
      <Breadcrumb
        items={[
          { name: "Tình trạng", path: "/trang-thai" },
          { name: `Trạng thái MST ${s.code}`, path },
        ]}
      />
      <JsonLd data={articleJsonLd({ slug: s.detailSlug!, path, title: `Trạng thái mã số thuế ${s.code}: ${s.officialName}`, description: s.explanation, published: "2026-09-21", modified: "2026-09-21" })} />
      <article className={v.prose}>
        <h1 className={styles.title}>
          Trạng thái mã số thuế {s.code}: {s.officialName}
        </h1>
        <p className={styles.lead}>{s.explanation}</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Trạng thái này có nghĩa gì</h2>
          <p>
            Theo Phụ lục I của Thông tư 90/2026/TT-BTC, trạng thái <strong>{s.code}</strong> có tên “{s.officialName}”. {s.applicability}
          </p>
          <p>Trạng thái do cơ quan thuế cập nhật trong hệ thống quản lý thuế. Trang này giải thích đúng theo văn bản, không suy rộng và không thay thế xác nhận của cơ quan thuế.</p>
        </section>

        {s.reasons.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Các lý do chi tiết theo văn bản</h2>
            <table className={v.mapTable}>
              <caption style={{ textAlign: "left", color: "var(--muted)" }}>Mã lý do và nội dung của trạng thái {s.code}</caption>
              <thead>
                <tr>
                  <th scope="col">Mã lý do</th>
                  <th scope="col">Tên lý do</th>
                  <th scope="col">Nội dung</th>
                </tr>
              </thead>
              <tbody>
                {s.reasons.map((r) => (
                  <tr key={r.code}>
                    <td>{r.code}</td>
                    <td>{r.name}</td>
                    <td>{r.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {s.whatToCheck && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Nên kiểm tra gì</h2>
            <ul>
              {s.whatToCheck.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Xem trên masothuedn.com</h2>
          <p>
            Tình trạng hoạt động trong dữ liệu doanh nghiệp của chúng tôi theo chữ của nguồn công bố, chưa quy đổi sang mã trạng thái này. Xem danh sách theo tình trạng ở{" "}
            <Link href="/trang-thai">trang trạng thái</Link>, hoặc tra một doanh nghiệp bằng <Link href="/cong-cu/kiem-tra-ma-so-thue">công cụ kiểm tra mã số thuế</Link>.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Văn bản nguồn</h2>
          <p>
            <a href={src.url} target="_blank" rel={REL_EXTERNAL_INFO}>
              {src.label}
            </a>{" "}
            ({src.issuer}; {src.meta}). {src.statusLabel}. Đối chiếu với văn bản chính thức ngày {legalVerifiedAt(s.legalSource)}.
          </p>
          <p style={{ color: "var(--muted)" }}>Xem danh mục đầy đủ tại <Link href="/trang-thai#danh-muc-trang-thai-mst">trang trạng thái</Link>.</p>
        </section>
      </article>
    </main>
  );
}
