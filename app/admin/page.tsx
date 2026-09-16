import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { loadAdminData } from "./data";
import { AdminConsole } from "./AdminConsole";
import siteStyles from "../components/site.module.css";

export const metadata: Metadata = {
  title: `Quản trị danh bạ | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await loadAdminData();

  return (
    <main className={siteStyles.page}>
      <h1 className={siteStyles.title}>Quản trị danh bạ</h1>
      <p className={siteStyles.lead}>Trang nội bộ, có mật khẩu, không cho Google vào.</p>
      <AdminConsole initialData={data} />
    </main>
  );
}
