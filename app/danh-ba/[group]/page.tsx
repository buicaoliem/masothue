import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { loadGroupPageData } from "./data";
import siteStyles from "../../components/site.module.css";
import dirStyles from "../../components/directory.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ group: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group: groupSlug } = await params;
  const data = await loadGroupPageData(groupSlug);
  if (data.notFound) return {};
  return {
    title: `${data.groupLabel} theo tỉnh, thành phố | ${SITE_NAME}`,
    description: `Doanh nghiệp ngành ${data.groupLabel.toLowerCase()} theo từng tỉnh, thành phố.`,
    alternates: { canonical: `${SITE_URL}/danh-ba/${groupSlug}` },
    robots: data.indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function DirectoryGroupPage({ params }: Props) {
  const { group: groupSlug } = await params;
  const data = await loadGroupPageData(groupSlug);
  if (data.notFound) notFound();
  const { groupLabel, provinces } = data;

  return (
    <main className={siteStyles.page}>
      <div className={dirStyles.crumb}>
        <Link href="/">Trang chủ</Link> / <Link href="/danh-ba">Danh bạ</Link> / {groupLabel}
      </div>
      <h1 className={siteStyles.title} style={{ textAlign: "center" }}>
        {groupLabel} theo tỉnh, thành phố
      </h1>

      {provinces.length === 0 ? (
        <div className={dirStyles.emptyRow}>
          <p>Chưa có doanh nghiệp nào trong ngành này</p>
          <div className={dirStyles.act}>
            <Link href="/cap-nhat-ho-so" className={dirStyles.btn}>
              Thêm doanh nghiệp của bạn
            </Link>
          </div>
        </div>
      ) : (
        <div className={siteStyles.chips} style={{ marginTop: 20, justifyContent: "center" }}>
          {provinces.map((p) => (
            <Link key={p.slug} href={`/danh-ba/${groupSlug}/${p.slug}`} className={siteStyles.chip}>
              {p.displayName} ({p.count.toLocaleString("vi-VN")})
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
