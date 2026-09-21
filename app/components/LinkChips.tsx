import Link from "next/link";
import styles from "./site.module.css";

export function LinkChips({ items }: { items: { href: string; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className={styles.chips}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={styles.chip}>
          {i.label}
        </Link>
      ))}
    </div>
  );
}
