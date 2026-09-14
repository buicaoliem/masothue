import Link from "next/link";
import styles from "./site.module.css";

type Item = { taxCode: string; name: string; address: string };

export function CompanyList({ items }: { items: Item[] }) {
  return (
    <ul className={styles.list}>
      {items.map((c) => (
        <li key={c.taxCode}>
          <Link href={`/${c.taxCode}`} className={styles.card}>
            <span className={styles.cardName}>{c.name}</span>
            <span className={styles.cardMeta}>MST {c.taxCode}</span>
            <span className={styles.cardMeta}>{c.address}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
