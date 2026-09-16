import type { Metadata } from "next";
import Link from "next/link";
import { DIRECTORY_GROUPS } from "@/lib/directory";
import { getGroupCountsNationwide, getProvinceSlugsWithAnyProfile } from "@/lib/directory-web";
import { PROVINCES } from "@/pipeline/province";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { GroupsGrid } from "./GroupsGrid";
import siteStyles from "../components/site.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const counts = await getGroupCountsNationwide();
  const indexable = [...counts.values()].some((n) => n > 0);
  return {
    title: `Danh bạ doanh nghiệp theo ngành | ${SITE_NAME}`,
    description: "Tra cứu doanh nghiệp theo ngành nghề và tỉnh, thành phố: kế toán, pháp lý, xây dựng, nhà hàng và nhiều ngành khác.",
    alternates: { canonical: `${SITE_URL}/danh-ba` },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function DirectoryHomePage() {
  const [counts, provinceSlugs] = await Promise.all([getGroupCountsNationwide(), getProvinceSlugsWithAnyProfile()]);

  const groups = DIRECTORY_GROUPS.map((g) => ({ slug: g.slug, label: g.label, count: counts.get(g.slug) ?? 0 }));
  const provinceSet = new Set(provinceSlugs);
  const provinces = PROVINCES.filter((p) => provinceSet.has(p.slug)).sort((a, b) => a.displayName.localeCompare(b.displayName, "vi"));

  return (
    <main className={siteStyles.page}>
      <h1 className={siteStyles.title}>Danh bạ doanh nghiệp theo ngành</h1>
      <p className={siteStyles.lead}>Tra cứu doanh nghiệp theo ngành nghề và tỉnh, thành phố.</p>

      <GroupsGrid groups={groups} />

      {provinces.length > 0 ? (
        <section className={siteStyles.section}>
          <h2 className={siteStyles.sectionTitle}>Theo tỉnh, thành phố</h2>
          <div className={siteStyles.chips}>
            {provinces.map((p) => (
              <Link key={p.slug} href={`/danh-ba/tinh/${p.slug}`} className={siteStyles.chip}>
                {p.displayName}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <p className={siteStyles.empty}>Danh bạ chưa có doanh nghiệp nào. Doanh nghiệp có thể tự thêm hồ sơ miễn phí.</p>
      )}
    </main>
  );
}
