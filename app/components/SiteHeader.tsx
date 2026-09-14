import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { SearchForm } from "./SearchForm";
import styles from "./site.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>
          {SITE_NAME}
        </Link>
        {/* Tools menu is wired up later. */}
        <a href="#" className={styles.menu}>
          Công cụ
        </a>
        <div className={styles.headerSearch}>
          <SearchForm />
        </div>
      </div>
    </header>
  );
}
