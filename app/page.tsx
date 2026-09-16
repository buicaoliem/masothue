import type { Metadata } from "next";
import Link from "next/link";
import { PROVINCES } from "@/pipeline/province";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { ENABLED_TOOLS } from "@/lib/tools/registry";
import { ToolListRow } from "./components/ToolListRow";
import { HomeHero } from "./HomeHero";
import styles from "./components/site.module.css";

export const metadata: Metadata = {
  title: `Tra cứu mã số thuế doanh nghiệp | ${SITE_NAME}`,
  description:
    "Tra cứu mã số thuế, tên, địa chỉ và tình trạng hoạt động của doanh nghiệp Việt Nam. Tìm theo mã số thuế, tên công ty hoặc theo tỉnh, thành phố.",
  alternates: { canonical: `${SITE_URL}/` },
};

export default function Home() {
  return (
    <main>
      <div className={styles.hero}>
        <div className={styles.wrap}>
          <h1 className={styles.title}>Tra cứu mã số thuế doanh nghiệp</h1>
          <p className={styles.lead}>Nhập mã số thuế để mở thẳng hồ sơ doanh nghiệp, hoặc nhập tên công ty để tìm.</p>
          <HomeHero />
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <h2 className={styles.sectionTitle}>Công cụ miễn phí cho kế toán</h2>
          <p className={styles.lead}>Số liệu theo quy định áp dụng năm 2026.</p>
          <div className={styles.toolsList}>
            {ENABLED_TOOLS.map((t) => (
              <ToolListRow key={t.slug} tool={t} />
            ))}
          </div>
          <div className={styles.moreRow}>
            <Link href="/cong-cu">Xem tất cả công cụ</Link>
          </div>
        </div>
      </section>

      <section id="tinh" className={styles.section} style={{ borderTop: "1px solid var(--line)" }}>
        <div className={styles.wrap}>
          <h2 className={styles.sectionTitle}>Tra cứu theo tỉnh, thành phố</h2>
          <div className={styles.chips}>
            {PROVINCES.map((p) => (
              <Link key={p.slug} href={`/tinh/${p.slug}`} className={styles.chip}>
                {p.displayName}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
