import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { searchCompaniesByName, SEARCH_LIMIT, TAX_CODE_RE } from "@/lib/company";
import { SITE_NAME } from "@/lib/site";
import { CompanyList } from "../components/CompanyList";
import { SearchForm } from "../components/SearchForm";
import styles from "../components/site.module.css";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

// Result pages are query-driven: keep them out of the index.
export const metadata: Metadata = {
  title: `Kết quả tìm kiếm | ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: Props) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 200);

  // A tax code goes straight to its page (which enriches or 404s on its own).
  const compact = q.replace(/\s+/g, "");
  if (TAX_CODE_RE.test(compact)) redirect(`/${compact}`);

  const results = q ? await searchCompaniesByName(q) : [];

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Kết quả tìm kiếm</h1>
      <div className={styles.lead}>
        <SearchForm defaultValue={q} />
      </div>
      {!q ? (
        <p className={styles.empty}>Nhập mã số thuế hoặc tên doanh nghiệp để tìm.</p>
      ) : results.length === 0 ? (
        <p className={styles.empty}>Không tìm thấy doanh nghiệp nào có tên chứa “{q}”.</p>
      ) : (
        <>
          <p className={styles.lead}>
            {results.length === SEARCH_LIMIT ? `Hiển thị ${SEARCH_LIMIT} kết quả đầu tiên` : `${results.length} kết quả`} cho “{q}”
          </p>
          <CompanyList items={results} />
        </>
      )}
    </main>
  );
}
