import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { buildStaticMetadata } from "@/lib/seo/metadata";
import { guidePath } from "@/lib/seo/urls";
import { Breadcrumb } from "../components/Breadcrumb";
import styles from "../components/site.module.css";

export const metadata = buildStaticMetadata({
  title: "Hướng dẫn mã số thuế và tra cứu doanh nghiệp",
  description: "Hướng dẫn về mã số thuế, cách kiểm tra doanh nghiệp còn hoạt động và các quy định liên quan, kèm công cụ tra cứu.",
  path: "/huong-dan",
});

export default function GuidesIndex() {
  return (
    <main className={styles.page}>
      <Breadcrumb items={[{ name: "Hướng dẫn", path: "/huong-dan" }]} />
      <h1 className={styles.title}>Hướng dẫn</h1>
      <p className={styles.lead}>Giải thích ngắn gọn về mã số thuế và cách dùng dữ liệu doanh nghiệp.</p>
      <ul className={styles.list}>
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={guidePath(g.slug)} className={styles.card}>
              <span className={styles.cardName}>{g.title}</span>
              <span className={styles.cardMeta}>{g.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
