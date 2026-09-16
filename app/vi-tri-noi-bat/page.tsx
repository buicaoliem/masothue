import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import siteStyles from "../components/site.module.css";

export const metadata: Metadata = {
  title: `Vị trí nổi bật | ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

export default function FeaturedPlacementPage() {
  return (
    <main className={siteStyles.page}>
      <h1 className={siteStyles.title}>Vị trí nổi bật</h1>
      <p className={siteStyles.lead}>Trang đang được hoàn thiện.</p>
    </main>
  );
}
