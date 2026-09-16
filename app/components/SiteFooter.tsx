import Link from "next/link";
import styles from "./site.module.css";

const LINKS = [
  { label: "Công cụ", href: "/cong-cu" },
  { label: "Yêu cầu gỡ thông tin", href: "/yeu-cau-go-thong-tin" },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span>© 2026 masothuedn.com · Thông tin doanh nghiệp công khai</span>
        <nav className={styles.footerLinks} aria-label="Chân trang">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
