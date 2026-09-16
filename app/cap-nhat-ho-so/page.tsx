import type { Metadata } from "next";
import { getCompanyForPrefillSafe } from "@/lib/company";
import { validateMst } from "@/lib/tools/mst";
import { SITE_NAME } from "@/lib/site";
import { ProfileForm } from "./ProfileForm";
import siteStyles from "../components/site.module.css";

type Props = { searchParams: Promise<{ mst?: string | string[] }> };

export const metadata: Metadata = {
  title: `Cập nhật hồ sơ doanh nghiệp | ${SITE_NAME}`,
  description: "Thêm hoặc cập nhật hồ sơ doanh nghiệp trong danh bạ masothuedn.com. Miễn phí.",
  robots: { index: false, follow: true },
};

export default async function UpdateProfilePage({ searchParams }: Props) {
  const raw = (await searchParams).mst;
  const mstParam = (Array.isArray(raw) ? raw[0] : raw ?? "").trim();
  const validated = mstParam ? validateMst(mstParam) : null;
  const normalizedMst = validated?.valid ? validated.normalized : mstParam;
  const prefill = validated?.valid ? await getCompanyForPrefillSafe(validated.normalized) : null;

  return (
    <main className={siteStyles.page}>
      <div className={siteStyles.crumb}>
        <a href="/danh-ba">Danh bạ</a> / Cập nhật hồ sơ
      </div>
      <h1 className={siteStyles.title}>Cập nhật hồ sơ doanh nghiệp</h1>
      <p className={siteStyles.lead}>
        Miễn phí. Chúng tôi gọi xác minh với người gửi trước khi đăng, để không ai sửa được hồ sơ của doanh nghiệp
        khác.
      </p>
      <ProfileForm
        initialMst={normalizedMst}
        initialCompanyName={prefill?.name ?? ""}
        initialAddress={prefill?.address ?? ""}
      />
    </main>
  );
}
