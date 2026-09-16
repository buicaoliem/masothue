import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DIRECTORY_GROUPS } from "@/lib/directory";
import { getGroupCountsForProvince } from "@/lib/directory-web";
import { PROVINCES } from "@/pipeline/province";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import siteStyles from "../../../components/site.module.css";
import dirStyles from "../../../components/directory.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ province: string }> };

const findProvince = (slug: string) => PROVINCES.find((p) => p.slug === slug);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { province: slug } = await params;
  const province = findProvince(slug);
  if (!province) return {};
  const counts = await getGroupCountsForProvince(slug);
  const indexable = counts.size > 0;
  return {
    title: `Danh bạ doanh nghiệp tại ${province.displayName} | ${SITE_NAME}`,
    description: `Các ngành có doanh nghiệp trong danh bạ tại ${province.displayName}.`,
    alternates: { canonical: `${SITE_URL}/danh-ba/tinh/${slug}` },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function DirectoryProvincePage({ params }: Props) {
  const { province: slug } = await params;
  const province = findProvince(slug);
  if (!province) notFound();

  const counts = await getGroupCountsForProvince(slug);
  const groups = DIRECTORY_GROUPS.filter((g) => (counts.get(g.slug) ?? 0) > 0).map((g) => ({
    ...g,
    count: counts.get(g.slug) ?? 0,
  }));

  return (
    <main className={siteStyles.page}>
      <div className={dirStyles.crumb}>
        <Link href="/">Trang chủ</Link> / <Link href="/danh-ba">Danh bạ</Link> / {province.displayName}
      </div>
      <h1 className={siteStyles.title}>Danh bạ doanh nghiệp tại {province.displayName}</h1>

      {groups.length === 0 ? (
        <p className={siteStyles.empty}>Chưa có ngành nào có doanh nghiệp tại {province.displayName} trong danh bạ.</p>
      ) : (
        <ul className={dirStyles.groupsGrid} style={{ listStyle: "none", padding: 0, margin: "20px 0 0" }}>
          {groups.map((g) => (
            <li key={g.slug}>
              <Link href={`/danh-ba/${g.slug}/${slug}`} className={dirStyles.groupCard}>
                <span className={dirStyles.groupCardName}>{g.label}</span>
                <span className={dirStyles.groupCardCount}>{g.count.toLocaleString("vi-VN")} doanh nghiệp</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
