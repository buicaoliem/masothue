import Link from "next/link";
import { allVsic2025, VSIC_2025_ROOT, vsic2025Path } from "@/lib/vsic/catalog";
import { webApplicationJsonLd } from "@/lib/seo/jsonld";
import { buildStaticMetadata } from "@/lib/seo/metadata";
import { Breadcrumb } from "../components/Breadcrumb";
import { JsonLd } from "../components/JsonLd";
import styles from "../components/site.module.css";
import { Vsic2025Explorer, type ExplorerItem } from "./Vsic2025Explorer";
import { VsicProvenance } from "./VsicProvenance";
import v from "./vsic.module.css";

const TITLE = "Tra cứu mã ngành nghề kinh doanh 2026 – VSIC 2025";
const DESCRIPTION =
  "Tra cứu mã ngành kinh tế Việt Nam theo Quyết định 36/2025/QĐ-TTg (VSIC 2025): tìm theo mã hoặc tên, xem 5 cấp, nội dung ngành và mã tương ứng VSIC 2018.";

export const metadata = buildStaticMetadata({ title: "Tra cứu mã ngành nghề kinh doanh 2026 - VSIC 2025", description: DESCRIPTION, path: VSIC_2025_ROOT });

export default function Vsic2025Index() {
  // Every code has a detail page for readers; only pages passing isVsic2025PageIndexable() are indexed and in the sitemap.
  const items: ExplorerItem[] = allVsic2025().map((e) => ({ c: e.code, l: e.level, n: e.name, ...(e.parentCode ? { p: e.parentCode } : {}), h: vsic2025Path(e) }));
  return (
    <main className={styles.page}>
      <Breadcrumb items={[{ name: "Mã ngành 2025", path: VSIC_2025_ROOT }]} />
      <JsonLd data={webApplicationJsonLd({ name: TITLE, path: VSIC_2025_ROOT, description: DESCRIPTION })} />
      <h1 className={styles.title}>{TITLE}</h1>
      <p className={styles.lead}>
        Hệ thống ngành kinh tế Việt Nam ban hành theo Quyết định 36/2025/QĐ-TTg, có hiệu lực từ 15/11/2025, thay thế Quyết định 27/2018/QĐ-TTg (VSIC 2018).
      </p>
      <div className={v.notice}>
        <strong>Lưu ý:</strong> dữ liệu doanh nghiệp trên masothuedn.com vẫn ghi mã ngành theo hệ 2018 như nguồn công bố; chúng tôi chưa chuyển mã của doanh nghiệp sang hệ 2025.
        Để đổi một mã cũ sang mã mới, dùng <Link href="/cong-cu/chuyen-doi-ma-nganh-2018-2025">công cụ chuyển đổi mã ngành 2018 - 2025</Link>.
      </div>

      <Vsic2025Explorer items={items} />

      <section className={`${styles.section} ${v.prose}`}>
        <h2 className={styles.sectionTitle}>Cấu trúc năm cấp của VSIC 2025</h2>
        <p>
          VSIC 2025 gồm 22 ngành cấp 1 (chữ cái A đến V), 87 ngành cấp 2 (2 chữ số), 259 ngành cấp 3, 495 ngành cấp 4 và 743 ngành cấp 5 (5 chữ số).
          Mã dài hơn nằm trong mã ngắn hơn có cùng phần đầu. Trang chi tiết của từng ngành có nội dung, phần “bao gồm”, “loại trừ” của văn bản
          và mã tương ứng trong VSIC 2018 theo bảng chuyển đổi chính thức, khi ngành đó có đủ nội dung.
        </p>
        <p>
          Xem thêm: <Link href="/huong-dan/ma-nganh-kinh-te-la-gi">Mã ngành kinh tế là gì</Link>,{" "}
          <Link href="/huong-dan/cach-tra-cuu-ma-nganh-cua-doanh-nghiep">cách tra cứu mã ngành của doanh nghiệp</Link>,{" "}
          <Link href="/nganh">tra doanh nghiệp theo ngành (dữ liệu theo VSIC 2018)</Link>.
        </p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Nguồn và phiên bản</h2>
        <VsicProvenance />
      </section>
    </main>
  );
}
