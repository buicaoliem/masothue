import type { ReactNode } from "react";
import { Breadcrumb } from "./Breadcrumb";
import styles from "./site.module.css";

/** Shell for static informational pages: breadcrumb, H1, lead and titled sections. */
export function InfoPage(props: { path: string; title: string; lead: string; crumbName?: string; children: ReactNode }) {
  return (
    <main className={styles.page}>
      <Breadcrumb items={[{ name: props.crumbName ?? props.title, path: props.path }]} />
      <h1 className={styles.title}>{props.title}</h1>
      <p className={styles.lead}>{props.lead}</p>
      {props.children}
    </main>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}
