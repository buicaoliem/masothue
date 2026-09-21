import type { ReactNode } from "react";
import { CompanyList } from "./CompanyList";
import { Pager } from "./Pager";
import { Breadcrumb } from "./Breadcrumb";
import { LIST_PAGE_SIZE, type ListedRow } from "@/lib/taxonomy-data";
import type { Crumb } from "@/lib/seo/jsonld";
import styles from "./site.module.css";

/** Shared body of every taxonomy hub: breadcrumb, H1, lead, extra modules, paginated company list. */
export function TaxonomyList(props: {
  crumbs: Crumb[];
  title: string;
  lead: ReactNode;
  total: number;
  rows: ListedRow[];
  page: number;
  hrefFor: (page: number) => string;
  children?: ReactNode;
  emptyText: string;
  /** Lets deep lists cap browsable pages (see INDUSTRY_LIST_MAX_PAGES). */
  pageCountOverride?: number;
}) {
  const pageCount = props.pageCountOverride ?? Math.max(1, Math.ceil(props.total / LIST_PAGE_SIZE));
  return (
    <main className={styles.page}>
      <Breadcrumb items={props.crumbs} />
      <h1 className={styles.title}>{props.title}</h1>
      {props.total === 0 ? (
        <p className={styles.empty}>{props.emptyText}</p>
      ) : (
        <>
          <p className={styles.lead}>{props.lead}</p>
          {props.children}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Danh sách doanh nghiệp</h2>
            <CompanyList items={props.rows} />
            <Pager page={props.page} pageCount={pageCount} hrefFor={props.hrefFor} />
          </section>
        </>
      )}
    </main>
  );
}
