import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";
import styles from "./site.module.css";

const LINKS = [
  { label: "Giới thiệu", href: "/gioi-thieu" },
  { label: "Điều khoản", href: "/dieu-khoan" },
  { label: "Chính sách bảo mật", href: "/chinh-sach-bao-mat" },
  { label: "Yêu cầu gỡ thông tin", href: "/yeu-cau-go-thong-tin" },
  { label: "Công cụ", href: "/cong-cu" },
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
        <span className={styles.footerContact}>
          Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </span>
      </div>
    </footer>
  );
}
