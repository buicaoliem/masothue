import type { Metadata } from "next";
import Link from "next/link";
import { PROVINCES } from "@/pipeline/province";
import { GUIDES } from "@/lib/guides";
import { SEO_CONFIG } from "@/lib/seo/config";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { STATUS_PAGES } from "@/lib/seo/taxonomy";
import { guidePath, industryPath, legalFormPath, statusPath } from "@/lib/seo/urls";
import { SITE_NAME } from "@/lib/site";
import { topIndexableIndustries } from "@/lib/industry/seo";
import { getDataAsOf, getNewCompanies, listLegalForms } from "@/lib/taxonomy-data";
import { ENABLED_TOOLS } from "@/lib/tools/registry";
import { CompanyList } from "./components/CompanyList";
import { JsonLd } from "./components/JsonLd";
import { LinkChips } from "./components/LinkChips";
import { ToolListRow } from "./components/ToolListRow";
import { HomeHero } from "./HomeHero";
import styles from "./components/site.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: `Tra cứu mã số thuế doanh nghiệp | ${SITE_NAME}`,
  description:
    "Tra cứu mã số thuế, tên, địa chỉ và tình trạng hoạt động của doanh nghiệp Việt Nam. Tìm theo mã số thuế, tên công ty hoặc theo tỉnh, thành phố.",
  path: "/",
  index: true,
});

// The homepage reads live counts; a database hiccup must not take the page down.
const orEmpty = <T,>(p: Promise<T>, empty: T) => p.catch(() => empty);

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

export default async function Home() {
  const [fresh, industries, legalForms, dataAsOf] = await Promise.all([
    orEmpty(getNewCompanies({ limit: SEO_CONFIG.homeNewCompanies }), { total: 0, rows: [] }),
    orEmpty(topIndexableIndustries(12), []),
    orEmpty(listLegalForms(SEO_CONFIG.taxonomyMinCompanies), []),
    orEmpty(getDataAsOf(), null),
  ]);

  return (
    <main>
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={organizationJsonLd()} />
      <div className={styles.hero}>
        <div className={styles.wrap}>
          <h1 className={styles.title}>Tra cứu mã số thuế doanh nghiệp</h1>
          <p className={styles.lead}>Nhập mã số thuế để mở thẳng hồ sơ doanh nghiệp, hoặc nhập tên công ty để tìm.</p>
          <HomeHero />
        </div>
      </div>

      {fresh.rows.length > 0 && (
        <section className={styles.section}>
          <div className={styles.wrap}>
            <h2 className={styles.sectionTitle}>Doanh nghiệp mới cập nhật</h2>
            <p className={styles.lead}>Doanh nghiệp có ngày cấp mã số thuế gần đây nhất trong dữ liệu.</p>
            <CompanyList items={fresh.rows} />
            <div className={styles.moreRow}>
              <Link href="/doanh-nghiep-moi">Xem tất cả doanh nghiệp mới</Link>
            </div>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.wrap}>
          <h2 className={styles.sectionTitle}>Công cụ miễn phí cho kế toán</h2>
          <p className={styles.lead}>Số liệu theo quy định áp dụng năm 2026.</p>
          <div className={styles.toolsList}>
            {ENABLED_TOOLS.map((t) => (
              <ToolListRow key={t.slug} tool={t} />
            ))}
          </div>
          <div className={styles.moreRow}>
            <Link href="/cong-cu">Xem tất cả công cụ</Link>
          </div>
        </div>
      </section>

      <section id="tinh" className={styles.section} style={{ borderTop: "1px solid var(--line)" }}>
        <div className={styles.wrap}>
          <h2 className={styles.sectionTitle}>Tra cứu theo tỉnh, thành phố</h2>
          <div className={styles.chips}>
            {PROVINCES.map((p) => (
              <Link key={p.slug} href={`/tinh/${p.slug}`} className={styles.chip}>
                {p.displayName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {industries.length > 0 && (
        <section className={styles.section} style={{ borderTop: "1px solid var(--line)" }}>
          <div className={styles.wrap}>
            <h2 className={styles.sectionTitle}>Tra cứu theo ngành nghề</h2>
            <LinkChips items={industries.map((i) => ({ href: industryPath(i.code, i.name), label: `${i.code} - ${i.name}` }))} />
            <div className={styles.moreRow}>
              <Link href="/nganh">Xem tất cả ngành nghề</Link>
            </div>
          </div>
        </section>
      )}

      <section className={styles.section} style={{ borderTop: "1px solid var(--line)" }}>
        <div className={styles.wrap}>
          <h2 className={styles.sectionTitle}>Tra cứu theo tình trạng và loại hình</h2>
          <LinkChips
            items={[
              ...STATUS_PAGES.map((s) => ({ href: statusPath(s.slug), label: s.label })),
              ...legalForms.slice(0, 6).map((f) => ({ href: legalFormPath(f.slug), label: f.label })),
            ]}
          />
        </div>
      </section>

      <section className={styles.section} style={{ borderTop: "1px solid var(--line)" }}>
        <div className={styles.wrap}>
          <h2 className={styles.sectionTitle}>Hướng dẫn</h2>
          <LinkChips items={GUIDES.map((g) => ({ href: guidePath(g.slug), label: g.title }))} />
          <div className={styles.moreRow}>
            <Link href="/huong-dan">Xem tất cả hướng dẫn</Link>
          </div>
        </div>
      </section>

      <section className={styles.section} style={{ borderTop: "1px solid var(--line)" }}>
        <div className={styles.wrap}>
          <h2 className={styles.sectionTitle}>Nguồn dữ liệu</h2>
          <p className={styles.lead}>
            Thông tin doanh nghiệp lấy từ nguồn đăng ký công khai và chưa được xác minh riêng với từng doanh nghiệp.
            {dataAsOf ? ` Ngày dữ liệu nguồn mới nhất: ${fmtDate(dataAsOf)}.` : ""} Xem{" "}
            <Link href="/nguon-du-lieu">nguồn dữ liệu</Link> và <Link href="/phuong-phap-du-lieu">phương pháp dữ liệu</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
