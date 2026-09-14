import Link from "next/link";
import { HeaderSearch } from "./HeaderSearch";
import { SiteLogo } from "./SiteLogo";
import styles from "./site.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <SiteLogo />
        <Link href="/cong-cu" className={styles.menu}>
          Công cụ
        </Link>
        <HeaderSearch />
      </div>
    </header>
  );
}
