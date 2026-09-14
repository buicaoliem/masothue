import type { Metadata } from "next";
import { getCompanyNameForRequest, TAX_CODE_RE } from "@/lib/company";
import { SITE_NAME } from "@/lib/site";
import { RemovalForm } from "./RemovalForm";
import siteStyles from "../components/site.module.css";
import styles from "./removal.module.css";

type Props = { searchParams: Promise<{ mst?: string | string[] }> };

// Utility page, not SEO content: keep it out of the index.
export const metadata: Metadata = {
  title: `Yêu cầu gỡ thông tin | ${SITE_NAME}`,
  description: "Gửi yêu cầu gỡ thông tin doanh nghiệp khỏi masothuedn.com. Mỗi yêu cầu được xem xét thủ công.",
  robots: { index: false, follow: true },
};

export default async function RemovalRequestPage({ searchParams }: Props) {
  const raw = (await searchParams).mst;
  const mst = (Array.isArray(raw) ? raw[0] : raw ?? "").replace(/\s+/g, "");
  const taxCode = TAX_CODE_RE.test(mst) ? mst : "";
  const name = taxCode ? await getCompanyNameForRequest(taxCode) : null;

  return (
    <main className={siteStyles.page}>
      <h1 className={siteStyles.title}>Yêu cầu gỡ thông tin</h1>
      <p className={styles.intro}>
        Điền thông tin bên dưới. Chúng tôi xem xét từng yêu cầu và phản hồi qua email liên hệ.
      </p>
      <RemovalForm initialTaxCode={taxCode} initialName={name} />
    </main>
  );
}
