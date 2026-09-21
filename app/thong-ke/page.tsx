import Link from "next/link";
import { PROVINCES } from "@/pipeline/province";
import { buildStaticMetadata } from "@/lib/seo/metadata";
import { statsPath } from "@/lib/seo/urls";
import { listProvinceCounts } from "@/lib/taxonomy-data";
import { LinkChips } from "../components/LinkChips";
import { Breadcrumb } from "../components/Breadcrumb";
import styles from "../components/site.module.css";

export const metadata = buildStaticMetadata({
  title: "Thống kê doanh nghiệp",
  description: "Thống kê doanh nghiệp toàn quốc và theo tỉnh, thành phố dựa trên dữ liệu công khai có trong masothuedn.com.",
  path: "/thong-ke",
});

export const dynamic = "force-dynamic";

export default async function StatsIndex() {
  const listed = new Set((await listProvinceCounts()).map((p) => p.provinceSlug));
  return (
    <main className={styles.page}>
      <Breadcrumb items={[{ name: "Thống kê", path: "/thong-ke" }]} />
      <h1 className={styles.title}>Thống kê doanh nghiệp</h1>
      <p className={styles.lead}>
        <Link href="/thong-ke/doanh-nghiep-viet-nam">Thống kê toàn quốc</Link> hoặc chọn tỉnh, thành phố:
      </p>
      <LinkChips items={PROVINCES.filter((p) => listed.has(p.slug)).map((p) => ({ href: statsPath(p.slug), label: p.displayName }))} />
    </main>
  );
}
