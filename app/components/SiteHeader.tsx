import Link from "next/link";
import { HeaderSearch } from "./HeaderSearch";
import { SiteLogo } from "./SiteLogo";
import styles from "./site.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <SiteLogo />
        <nav className={styles.navMain} aria-label="Menu chính">
          <Link href="/">Tra cứu</Link>
          <Link href="/cong-cu">Công cụ</Link>
          <Link href="/#tinh">Theo tỉnh</Link>
        </nav>
        <HeaderSearch />
      </div>
    </header>
  );
}
