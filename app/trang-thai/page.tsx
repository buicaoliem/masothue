import Link from "next/link";
import { legalCitation } from "@/lib/legal/sources";
import { buildStaticMetadata } from "@/lib/seo/metadata";
import { STATUS_PAGES } from "@/lib/seo/taxonomy";
import { statusPath } from "@/lib/seo/urls";
import { countCompanies } from "@/lib/taxonomy-data";
import { TAX_STATUSES, taxStatusPath, TAX_STATUS_LIST_TITLE } from "@/lib/tax-status/catalog";
import { Breadcrumb } from "../components/Breadcrumb";
import styles from "../components/site.module.css";
import v from "../ma-nganh-2025/vsic.module.css";

export const dynamic = "force-dynamic";

export const metadata = buildStaticMetadata({
  title: "Trạng thái mã số thuế và tình trạng hoạt động doanh nghiệp",
  description: "Danh mục trạng thái mã số thuế 00, 01, 02, 03, 05, 06, 07, 09, 10 theo Thông tư 90/2026/TT-BTC và tra cứu doanh nghiệp theo tình trạng hoạt động.",
  path: "/trang-thai",
});

export default async function StatusIndex() {
  const counts = await Promise.all(STATUS_PAGES.map((s) => countCompanies(s.where)));
  return (
    <main className={styles.page}>
      <Breadcrumb items={[{ name: "Tình trạng", path: "/trang-thai" }]} />
      <h1 className={styles.title}>Trạng thái mã số thuế và tình trạng hoạt động doanh nghiệp</h1>
      <p className={styles.lead}>
        Danh mục trạng thái mã số thuế do cơ quan thuế quản lý, và danh sách doanh nghiệp theo tình trạng hoạt động trong dữ liệu của chúng tôi.
      </p>

      <section className={styles.section} id="danh-muc-trang-thai-mst">
        <h2 className={styles.sectionTitle}>Danh mục trạng thái mã số thuế</h2>
        <p style={{ maxWidth: 760, marginInline: "auto" }}>
          Theo Phụ lục I của {legalCitation("taxRegistration2026")} (Bộ trưởng Bộ Tài chính ký ngày 30/06/2026, hiệu lực từ 01/07/2026, thay Thông tư 86/2024/TT-BTC).
          Đây là trang tham khảo, không phải tư vấn pháp lý cho trường hợp cụ thể. Mỗi trạng thái có thể kèm các lý do chi tiết; mã 08 không có trong danh mục.
        </p>
        <table className={v.mapTable}>
          <caption style={{ textAlign: "left", color: "var(--muted)" }}>{TAX_STATUS_LIST_TITLE}</caption>
          <thead>
            <tr>
              <th scope="col">Mã</th>
              <th scope="col">Tên trạng thái theo văn bản</th>
              <th scope="col">Giải thích ngắn</th>
            </tr>
          </thead>
          <tbody>
            {TAX_STATUSES.map((s) => (
              <tr key={s.code} id={`ma-${s.code}`}>
                <td>
                  <strong>{s.code}</strong>
                </td>
                <td>
                  {s.detailSlug && s.effectiveStatus === "in-force" ? <Link href={taxStatusPath(s.detailSlug)}>{s.officialName}</Link> : s.officialName}
                  {s.effectiveStatus === "void" && <span className={v.rel}>Hết hiệu lực</span>}
                </td>
                <td>{s.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: "var(--muted)" }}>
          Dữ liệu doanh nghiệp trên masothuedn.com ghi tình trạng theo chữ của từng nguồn công bố (cơ quan thuế hoặc cơ quan đăng ký kinh doanh), chưa được quy đổi sang các mã trên, nên hai phần dưới đây độc lập với nhau.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Doanh nghiệp theo tình trạng hoạt động</h2>
        <ul className={styles.list}>
          {STATUS_PAGES.map((s, i) => (
            <li key={s.slug}>
              <Link href={statusPath(s.slug)} className={styles.card}>
                <span className={styles.cardName}>{s.title}</span>
                <span className={styles.cardMeta}>{counts[i].toLocaleString("vi-VN")} doanh nghiệp</span>
              </Link>
            </li>
          ))}
        </ul>
        <p style={{ color: "var(--muted)" }}>
          Xem thêm <Link href="/huong-dan/trang-thai-hoat-dong-cua-doanh-nghiep">cách đọc tình trạng hoạt động</Link> và{" "}
          <Link href="/huong-dan/kiem-tra-doanh-nghiep-con-hoat-dong">cách kiểm tra doanh nghiệp còn hoạt động</Link>.
        </p>
      </section>
    </main>
  );
}
