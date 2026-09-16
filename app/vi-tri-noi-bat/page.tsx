import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { SponsorForm } from "./SponsorForm";
import siteStyles from "../components/site.module.css";
import styles from "../components/directoryForm.module.css";

type Props = { searchParams: Promise<{ nhom?: string; tinh?: string; mst?: string }> };

// Indexable landing page: no robots override here (site-wide allow applies).
export const metadata: Metadata = {
  title: `Vị trí nổi bật trong danh bạ | ${SITE_NAME}`,
  description: "Đưa doanh nghiệp lên đầu trang ngành trong danh bạ masothuedn.com. Để lại thông tin để nhận báo giá.",
};

export default async function FeaturedPlacementPage({ searchParams }: Props) {
  const sp = await searchParams;
  const zaloNumber = process.env.NEXT_PUBLIC_SALES_ZALO;

  return (
    <main className={siteStyles.page}>
      <div className={siteStyles.crumb}>
        <a href="/danh-ba">Danh bạ</a> / Vị trí nổi bật
      </div>
      <h1 className={siteStyles.title}>Đưa doanh nghiệp lên đầu ngành</h1>
      <p className={siteStyles.lead}>Mỗi trang ngành theo tỉnh có tối đa 3 vị trí &quot;Đứng đầu ngành&quot;.</p>

      <div className={styles.perks}>
        <div className={styles.perk}>
          <h3>Đầu trang ngành</h3>
          <p>Logo và tên doanh nghiệp nằm trên cùng, trước mọi doanh nghiệp khác.</p>
        </div>
        <div className={styles.perk}>
          <h3>Nút liên hệ</h3>
          <p>Khách bấm gọi điện hoặc nhắn Zalo ngay, không cần tìm số.</p>
        </div>
        <div className={styles.perk}>
          <h3>Hồ sơ đầy đủ</h3>
          <p>Trang riêng có dịch vụ, hình ảnh và huy hiệu &quot;Đứng đầu ngành&quot;.</p>
        </div>
      </div>
      <p className={styles.price}>Giá tùy ngành và tỉnh. Để lại thông tin, chúng tôi báo giá trong giờ làm việc.</p>

      <SponsorForm
        initialGroupSlug={sp.nhom ?? ""}
        initialProvinceSlug={sp.tinh ?? ""}
        initialMst={sp.mst ?? ""}
        zaloNumber={zaloNumber ?? null}
      />
    </main>
  );
}
