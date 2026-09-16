import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import siteStyles from "../components/site.module.css";

export const metadata: Metadata = {
  title: `Cập nhật hồ sơ doanh nghiệp | ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

export default function UpdateProfilePage() {
  return (
    <main className={siteStyles.page}>
      <h1 className={siteStyles.title}>Cập nhật hồ sơ doanh nghiệp</h1>
      <p className={siteStyles.lead}>Trang đang được hoàn thiện.</p>
    </main>
  );
}
