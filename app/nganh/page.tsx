import Link from "next/link";
import { CLASSIFICATION_NOTE } from "@/lib/industry/classification";
import { listIndexableIndustries } from "@/lib/industry/seo";
import { buildStaticMetadata } from "@/lib/seo/metadata";
import { industryPath } from "@/lib/seo/urls";
import { Breadcrumb } from "../components/Breadcrumb";
import styles from "../components/site.module.css";

export const dynamic = "force-dynamic";

export const metadata = buildStaticMetadata({
  title: "Tra cứu doanh nghiệp theo ngành nghề",
  description: "Danh sách ngành nghề (mã ngành kinh tế) có doanh nghiệp trong dữ liệu: chọn ngành để xem doanh nghiệp, mã số thuế và phân bố theo tỉnh.",
  path: "/nganh",
});

export default async function IndustriesIndex() {
  // Only industries that pass the SEO quality rule are listed; the rest stay reachable from company pages.
  const industries = (await listIndexableIndustries()).sort((a, b) => b.companyCount - a.companyCount || a.code.localeCompare(b.code));
  return (
    <main className={styles.page}>
      <Breadcrumb items={[{ name: "Ngành nghề", path: "/nganh" }]} />
      <h1 className={styles.title}>Tra cứu doanh nghiệp theo ngành nghề</h1>
      <p className={styles.lead}>{CLASSIFICATION_NOTE}</p>
      {industries.length === 0 ? (
        <p className={styles.empty}>Chưa có ngành nào đủ dữ liệu để hiển thị.</p>
      ) : (
        <ul className={styles.list}>
          {industries.map((i) => (
            <li key={i.code}>
              <Link href={industryPath(i.code, i.name)} className={styles.card}>
                <span className={styles.cardName}>
                  {i.code} - {i.name}
                </span>
                <span className={styles.cardMeta}>
                  {i.companyCount.toLocaleString("vi-VN")} doanh nghiệp có đăng ký
                  {i.primaryCount > 0 ? ` · ${i.primaryCount.toLocaleString("vi-VN")} có ngành chính` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
