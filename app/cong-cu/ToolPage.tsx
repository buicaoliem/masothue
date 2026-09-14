import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTool } from "@/lib/tools/registry";
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

/** Shared frame of a tool page: title, "what it does" intro, the tool, back link. */
export function ToolPage({ slug, intro, children }: { slug: string; intro: React.ReactNode; children: React.ReactNode }) {
  const tool = getTool(slug);
  if (!tool.enabled) notFound();
  return (
    <main className={siteStyles.page}>
      <h1 className={siteStyles.title}>{tool.name}</h1>
      <div className={styles.intro}>{intro}</div>
      {children}
      <div className={styles.backRow}>
        <Link href="/cong-cu" className={styles.backLink}>
          Xem các công cụ khác →
        </Link>
      </div>
    </main>
  );
}
