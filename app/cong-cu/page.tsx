import type { Metadata } from "next";
import Link from "next/link";
import { ENABLED_TOOLS } from "@/lib/tools/registry";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import siteStyles from "../components/site.module.css";
import styles from "./tools.module.css";

export const metadata: Metadata = {
  title: `Công cụ kế toán, thuế miễn phí | ${SITE_NAME}`,
  description:
    "Công cụ miễn phí cho kế toán và doanh nghiệp: đổi số tiền thành chữ, tính thuế GTGT (VAT), tính lương Gross - Net.",
  alternates: { canonical: `${SITE_URL}/cong-cu` },
};

export default function ToolsCatalog() {
  return (
    <main className={siteStyles.page}>
      <h1 className={siteStyles.title}>Công cụ</h1>
      <p className={siteStyles.lead}>Công cụ nhỏ cho kế toán và doanh nghiệp, dùng ngay trên trình duyệt.</p>
      <ul className={styles.catalog}>
        {ENABLED_TOOLS.map((t) => (
          <li key={t.slug}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{t.name}</h2>
              <p className={styles.cardDesc}>{t.summary}</p>
              <div className={styles.actions}>
                <Link href={`/cong-cu/${t.slug}`} className={styles.primaryBtn}>
                  Mở công cụ
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
