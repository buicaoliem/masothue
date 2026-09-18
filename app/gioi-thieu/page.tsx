import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, OPERATOR_NAME, SITE_NAME, SITE_URL } from "@/lib/site";
import siteStyles from "../components/site.module.css";

export const metadata: Metadata = {
  title: `Giới thiệu | ${SITE_NAME}`,
  description: "masothuedn.com là gì: tra cứu mã số thuế, công cụ kế toán miễn phí và danh bạ doanh nghiệp theo ngành, tỉnh.",
  alternates: { canonical: `${SITE_URL}/gioi-thieu` },
};

export default function AboutPage() {
  return (
    <main className={siteStyles.page}>
      <div className={siteStyles.crumb}>
        <Link href="/">Trang chủ</Link> / Giới thiệu
      </div>
      <h1 className={siteStyles.title}>Giới thiệu</h1>
      <p className={siteStyles.lead}>masothuedn.com giúp tra cứu thông tin doanh nghiệp và tính toán thuế, lương nhanh chóng.</p>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>masothuedn.com là gì</h2>
        <p>
          masothuedn.com là trang tra cứu mã số thuế doanh nghiệp, cung cấp bộ{" "}
          <Link href="/cong-cu">công cụ kế toán, thuế miễn phí</Link> (tính thuế TNCN, tính lương, đổi số thành chữ,
          tính thuế GTGT...) và <Link href="/danh-ba">danh bạ doanh nghiệp</Link> sắp xếp theo ngành và tỉnh, thành
          phố.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Danh bạ hoạt động thế nào</h2>
        <p>
          Doanh nghiệp muốn có hồ sơ trong danh bạ tự gửi thông tin qua trang{" "}
          <Link href="/cap-nhat-ho-so">cập nhật hồ sơ</Link>. Chúng tôi gọi điện xác minh với người đại diện, sau đó
          hồ sơ mới được đăng công khai.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Liên hệ</h2>
        <p>
          {OPERATOR_NAME}. Email liên hệ: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </main>
  );
}
