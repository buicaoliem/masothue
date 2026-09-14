import styles from "./site.module.css";

/** Plain GET form to /tim-kiem: works without JavaScript. */
export function SearchForm({ large = false, defaultValue = "" }: { large?: boolean; defaultValue?: string }) {
  return (
    <form action="/tim-kiem" method="get" role="search" className={`${styles.search} ${large ? styles.searchLarge : ""}`}>
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        required
        placeholder="Nhập mã số thuế hoặc tên doanh nghiệp"
        aria-label="Mã số thuế hoặc tên doanh nghiệp"
        className={styles.searchInput}
      />
      <button type="submit" className={styles.searchBtn}>
        Tra cứu
      </button>
    </form>
  );
}
