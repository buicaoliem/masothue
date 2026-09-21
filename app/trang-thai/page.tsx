import Link from "next/link";
import { buildStaticMetadata } from "@/lib/seo/metadata";
import { STATUS_PAGES } from "@/lib/seo/taxonomy";
import { statusPath } from "@/lib/seo/urls";
import { countCompanies } from "@/lib/taxonomy-data";
import { Breadcrumb } from "../components/Breadcrumb";
import styles from "../components/site.module.css";

export const dynamic = "force-dynamic";

export const metadata = buildStaticMetadata({
  title: "Tra cứu doanh nghiệp theo tình trạng hoạt động",
  description: "Doanh nghiệp đang hoạt động, tạm ngừng kinh doanh hoặc ngừng hoạt động theo dữ liệu đăng ký công khai.",
  path: "/trang-thai",
});

export default async function StatusIndex() {
  const counts = await Promise.all(STATUS_PAGES.map((s) => countCompanies(s.where)));
  return (
    <main className={styles.page}>
      <Breadcrumb items={[{ name: "Tình trạng", path: "/trang-thai" }]} />
      <h1 className={styles.title}>Tra cứu doanh nghiệp theo tình trạng hoạt động</h1>
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
    </main>
  );
}
