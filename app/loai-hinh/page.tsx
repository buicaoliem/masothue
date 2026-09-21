import Link from "next/link";
import { SEO_CONFIG } from "@/lib/seo/config";
import { buildStaticMetadata } from "@/lib/seo/metadata";
import { legalFormPath } from "@/lib/seo/urls";
import { listLegalForms } from "@/lib/taxonomy-data";
import { Breadcrumb } from "../components/Breadcrumb";
import styles from "../components/site.module.css";

export const dynamic = "force-dynamic";

export const metadata = buildStaticMetadata({
  title: "Tra cứu doanh nghiệp theo loại hình",
  description: "Các loại hình doanh nghiệp có trong dữ liệu: công ty cổ phần, TNHH, doanh nghiệp tư nhân... Chọn loại hình để xem danh sách doanh nghiệp.",
  path: "/loai-hinh",
});

export default async function LegalFormsIndex() {
  const forms = await listLegalForms(SEO_CONFIG.taxonomyMinCompanies);
  return (
    <main className={styles.page}>
      <Breadcrumb items={[{ name: "Loại hình", path: "/loai-hinh" }]} />
      <h1 className={styles.title}>Tra cứu doanh nghiệp theo loại hình</h1>
      {forms.length === 0 ? (
        <p className={styles.empty}>Chưa có loại hình nào đủ dữ liệu để hiển thị.</p>
      ) : (
        <ul className={styles.list}>
          {forms.map((f) => (
            <li key={f.slug}>
              <Link href={legalFormPath(f.slug)} className={styles.card}>
                <span className={styles.cardName}>{f.label}</span>
                <span className={styles.cardMeta}>{f.total.toLocaleString("vi-VN")} doanh nghiệp</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
