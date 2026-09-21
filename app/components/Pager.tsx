import Link from "next/link";
import styles from "./site.module.css";

/** Server-rendered pagination with real anchors. `hrefFor(1)` must return the un-paged base URL. */
export function Pager({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav className={styles.pager} aria-label="Phân trang">
      <span className={styles.pagerInfo}>
        Trang {page} / {pageCount}
      </span>
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className={styles.pagerLink}>
          Trang trước
        </Link>
      )}
      {page < pageCount && (
        <Link href={hrefFor(page + 1)} className={styles.pagerLink}>
          Trang sau
        </Link>
      )}
    </nav>
  );
}
