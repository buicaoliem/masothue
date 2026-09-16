import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ENABLED_TOOLS, getTool } from "@/lib/tools/registry";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import siteStyles from "../components/site.module.css";
import styles from "./tools.module.css";

export function toolMetadata(slug: string): Metadata {
  const tool = getTool(slug);
  if (!tool.enabled) return {};
  const title = `${tool.name} | ${SITE_NAME}`;
  const url = `${SITE_URL}/cong-cu/${slug}`;
  return {
    title,
    description: tool.description,
    alternates: { canonical: url },
    openGraph: { title, description: tool.description, url, siteName: SITE_NAME, type: "website", locale: "vi_VN" },
  };
}

/** Shared frame of a tool page: breadcrumb, title, "what it does" intro, the tool, other tools. */
export function ToolPage({ slug, intro, children }: { slug: string; intro: React.ReactNode; children: React.ReactNode }) {
  const tool = getTool(slug);
  if (!tool.enabled) notFound();
  const others = ENABLED_TOOLS.filter((t) => t.slug !== slug);
  return (
    <main className={siteStyles.page}>
      <div className={siteStyles.crumb}>
        <Link href="/">Trang chủ</Link> / <Link href="/cong-cu">Công cụ</Link> / {tool.name}
      </div>
      <h1 className={siteStyles.title}>{tool.name}</h1>
      <div className={styles.intro}>{intro}</div>
      {children}
      {others.length > 0 && (
        <section className={styles.others}>
          <h2 className={siteStyles.sectionTitle}>Công cụ khác</h2>
          <div className={siteStyles.chips}>
            {others.map((t) => (
              <Link key={t.slug} href={`/cong-cu/${t.slug}`} className={siteStyles.chip}>
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
