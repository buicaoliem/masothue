import Link from "next/link";
import styles from "./site.module.css";

// Placeholder hrefs until those pages exist.
const LINKS = [
  { label: "Trang chủ", href: "/" },
  { label: "Giới thiệu", href: "#" },
  { label: "Điều khoản", href: "#" },
  { label: "Yêu cầu gỡ thông tin", href: "/yeu-cau-go-thong-tin" },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <ul className={styles.footerLinks}>
          {LINKS.map((l) => (
            <li key={l.label}>
              <Link href={l.href}>{l.label}</Link>
            </li>
          ))}
        </ul>
        <p className={styles.footerNote}>Dữ liệu từ Cổng thông tin ĐKDN quốc gia</p>
      </div>
    </footer>
  );
}
