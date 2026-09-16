import type { Metadata } from "next";
import Link from "next/link";
import { ENABLED_TOOLS } from "@/lib/tools/registry";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { ToolListRow } from "../components/ToolListRow";
import { TOOL_GROUP, TOOL_GROUP_LABEL, type ToolGroupKey } from "./toolDisplay";
import siteStyles from "../components/site.module.css";

export const metadata: Metadata = {
  title: `Công cụ kế toán, thuế miễn phí | ${SITE_NAME}`,
  description:
    "Công cụ miễn phí cho kế toán và doanh nghiệp: kiểm tra mã số thuế, tính thuế TNCN, đổi số tiền thành chữ, tính thuế GTGT (VAT), tính lương Gross - Net.",
  alternates: { canonical: `${SITE_URL}/cong-cu` },
};

const GROUPS: ToolGroupKey[] = ["thue-luong", "mst-chung-tu"];

export default function ToolsCatalog() {
  return (
    <main className={siteStyles.page}>
      <div className={siteStyles.crumb}>
        <Link href="/">Trang chủ</Link> / Công cụ
      </div>
      <h1 className={siteStyles.title}>Công cụ kế toán, thuế miễn phí</h1>
      <p className={siteStyles.lead}>Dùng ngay trên trình duyệt, không cần đăng ký. Số liệu theo quy định áp dụng năm 2026.</p>

      {GROUPS.map((group) => {
        const tools = ENABLED_TOOLS.filter((t) => TOOL_GROUP[t.slug] === group);
        if (tools.length === 0) return null;
        return (
          <section key={group} className={siteStyles.section}>
            <h2 className={siteStyles.sectionTitle}>{TOOL_GROUP_LABEL[group]}</h2>
            <div className={siteStyles.toolsList}>
              {tools.map((t) => (
                <ToolListRow key={t.slug} tool={t} />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
