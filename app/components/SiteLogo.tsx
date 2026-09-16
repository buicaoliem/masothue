import Link from "next/link";
import styles from "./site.module.css";

/** Magnifier icon + "masothuedn" wordmark, linking home. Colors come from the shared tokens (--ink / --blue). */
export function SiteLogo() {
  return (
    <Link href="/" className={styles.brand} aria-label="masothuedn.com - Trang chủ">
      <svg viewBox="0 0 42 42" fill="none" className={styles.brandIcon} aria-hidden="true">
        <circle cx="18" cy="18" r="11" stroke="currentColor" strokeWidth="3.5" />
        <line x1="26" y1="26" x2="35" y2="35" stroke="var(--blue)" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className={styles.brandText}>
        <span className={styles.wordmark}>
          masothue<span className={styles.wordmarkAccent}>dn</span>
        </span>
        <span className={styles.tagline}>TRA CỨU DOANH NGHIỆP</span>
      </span>
    </Link>
  );
}
