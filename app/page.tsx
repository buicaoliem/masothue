import type { Metadata } from "next";
import Link from "next/link";
import { PROVINCES } from "@/pipeline/province";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SearchForm } from "./components/SearchForm";
import styles from "./components/site.module.css";

export const metadata: Metadata = {
  title: `Tra cứu mã số thuế doanh nghiệp | ${SITE_NAME}`,
  description:
    "Tra cứu mã số thuế, tên, địa chỉ và tình trạng hoạt động của doanh nghiệp Việt Nam. Tìm theo mã số thuế, tên công ty hoặc theo tỉnh, thành phố.",
  alternates: { canonical: `${SITE_URL}/` },
};

export default function Home() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Tra cứu mã số thuế doanh nghiệp</h1>
      <p className={styles.lead}>Nhập mã số thuế để mở thẳng trang doanh nghiệp, hoặc nhập tên để tìm.</p>
      <SearchForm large />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tra cứu theo tỉnh</h2>
        <ul className={styles.provinces}>
          {PROVINCES.map((p) => (
            <li key={p.slug}>
              <Link href={`/tinh/${p.slug}`} className={styles.provinceLink}>
                {p.displayName}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
