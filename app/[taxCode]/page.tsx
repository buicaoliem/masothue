import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompany, getNearbyCompanies } from "@/lib/company";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { AFFILIATE_LINKS, ZALO_CONTACT, type ServiceKey } from "@/lib/config";
import { CopyButton } from "./CopyButton";
import styles from "./company.module.css";

type Props = { params: Promise<{ taxCode: string }> };
type Company = NonNullable<Awaited<ReturnType<typeof getCompany>>>;

function statusTone(status: string): "active" | "stopped" | "neutral" {
  const s = status.toLowerCase();
  if (s.includes("ngừng") || s.includes("chấm dứt") || s.includes("giải thể")) return "stopped";
  if (s.includes("đang hoạt động")) return "active";
  return "neutral";
}

function formatDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/** Prose summary built only from fields that have data. */
function buildSummary(c: Company): string {
  let first = `${c.name} có mã số thuế ${c.taxCode}`;
  if (c.activeDate) first += `, được cấp ngày ${formatDate(c.activeDate)}`;
  const parts = [`${first}.`];
  // The address already ends with the province, in varying spellings; don't append the catalog name.
  parts.push(`Trụ sở đặt tại ${c.address}.`);
  if (c.representativeName) parts.push(`Người đại diện theo pháp luật là ${c.representativeName}.`);
  if (c.status) parts.push(`Tình trạng hiện tại: ${c.status}.`);
  return parts.join(" ");
}

/** FAQ entries built only from fields that have data. */
function buildFaq(c: Company): { q: string; a: string }[] {
  const faq = [
    { q: `Mã số thuế của ${c.name} là gì?`, a: `Mã số thuế của ${c.name} là ${c.taxCode}.` },
    { q: `${c.name} ở đâu?`, a: `${c.name} có địa chỉ tại ${c.address}.` },
  ];
  if (c.representativeName) {
    faq.push({
      q: `Ai là người đại diện của ${c.name}?`,
      a: `Người đại diện theo pháp luật của ${c.name} là ${c.representativeName}.`,
    });
  }
  if (c.status) {
    const tone = statusTone(c.status);
    const lead = tone === "active" ? "Có. " : tone === "stopped" ? "Không. " : "";
    faq.push({ q: `${c.name} còn hoạt động không?`, a: `${lead}Tình trạng theo dữ liệu thuế: ${c.status}.` });
  }
  return faq;
}

const DESCRIPTION_MAX = 160;

/** Meta description from fields that have data, cut at a word boundary to ~160 chars. */
function buildDescription(c: Company): string {
  const parts = [`${c.name} - Mã số thuế ${c.taxCode}`, `Địa chỉ: ${c.address}`];
  // Skip the province when the address already spells it out.
  if (c.province && !c.address.toLowerCase().includes(c.province.replace(/^TP\.\s*/, "").toLowerCase())) {
    parts.push(c.province);
  }
  if (c.status) parts.push(`Tình trạng: ${c.status}`);
  const text = `${parts.join(". ")}.`;
  if (text.length <= DESCRIPTION_MAX) return text;
  const cut = text.slice(0, DESCRIPTION_MAX - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s.,:;-]+$/, "")}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { taxCode } = await params;
  const company = await getCompany(taxCode);
  if (!company) return {};
  const title = `${company.name} - Mã số thuế ${company.taxCode} | ${SITE_NAME}`;
  const description = buildDescription(company);
  const url = `${SITE_URL}/${company.taxCode}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website", locale: "vi_VN" },
  };
}

function buildOrganizationJsonLd(c: Company) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: c.name,
    url: `${SITE_URL}/${c.taxCode}`,
    taxID: c.taxCode,
    identifier: { "@type": "PropertyValue", propertyID: "Mã số thuế", value: c.taxCode },
    address: {
      "@type": "PostalAddress",
      streetAddress: c.address,
      ...(c.province && { addressRegion: c.province }),
      addressCountry: "VN",
    },
    ...(c.province && { areaServed: c.province }),
  };
}

const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");

// Static service strip; link targets live in lib/config.ts.
const SERVICES: { key: ServiceKey; title: string; desc: string }[] = [
  { key: "digitalSignature", title: "Chữ ký số", desc: "Ký số tờ khai thuế, hóa đơn và hợp đồng điện tử." },
  { key: "eInvoice", title: "Hóa đơn điện tử", desc: "Phát hành hóa đơn điện tử đúng quy định." },
  { key: "website", title: "Thiết kế website", desc: "Website giới thiệu doanh nghiệp chuẩn di động." },
];

export default async function CompanyPage({ params }: Props) {
  const { taxCode } = await params;
  const company = await getCompany(taxCode);
  if (!company) notFound();

  const rows = [
    ["Mã số thuế", company.taxCode],
    ["Địa chỉ", company.address],
    ["Tỉnh / Thành phố", company.province],
    ["Tình trạng", company.status],
    ["Người đại diện", company.representativeName],
    ["Ngành nghề chính", company.mainIndustry],
  ].filter((r): r is [string, string] => Boolean(r[1]));

  const invoiceRows: [string, string][] = [
    ["Tên công ty", company.name],
    ["Mã số thuế", company.taxCode],
    ["Địa chỉ", company.address],
  ];

  const faq = buildFaq(company);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const nearby = await getNearbyCompanies(company.provinceSlug, company.taxCode);
  const claimMessage = ZALO_CONTACT.claimMessage(company.name, company.taxCode);

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(buildOrganizationJsonLd(company)) }} />
      <header className={styles.header}>
        <div className={styles.removalLink}>
          <Link href={`/yeu-cau-go-thong-tin?mst=${company.taxCode}`} rel="nofollow">
            Yêu cầu gỡ thông tin
          </Link>
        </div>
        <h1 className={styles.name}>{company.name}</h1>
        <p className={styles.taxCode}>
          Mã số thuế: <strong>{company.taxCode}</strong>
        </p>
        {company.status && (
          <span className={`${styles.badge} ${styles[statusTone(company.status)]}`}>{company.status}</span>
        )}
      </header>

      <div className={styles.claim}>
        <div className={styles.claimHint}>
          <div className={styles.invoiceText}>
            <span className={styles.invoiceLabel}>Nội dung nhắn Zalo</span>
            <span className={styles.invoiceValue}>{claimMessage}</span>
          </div>
          <CopyButton value={claimMessage} />
        </div>
        <div className={styles.actions}>
          <a href={ZALO_CONTACT.url} target="_blank" rel="noopener noreferrer" className={styles.quoteBtn}>
            Đây là doanh nghiệp của tôi
          </a>
        </div>
      </div>

      <dl className={styles.info}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.row}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Thông tin xuất hóa đơn</h2>
        <ul className={styles.invoice}>
          {invoiceRows.map(([label, value]) => (
            <li key={label} className={styles.invoiceRow}>
              <div className={styles.invoiceText}>
                <span className={styles.invoiceLabel}>{label}</span>
                <span className={styles.invoiceValue}>{value}</span>
              </div>
              <CopyButton value={value} />
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tóm tắt</h2>
        <p className={styles.summary}>{buildSummary(company)}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Câu hỏi thường gặp</h2>
        <div className={styles.faq}>
          {faq.map(({ q, a }) => (
            <details key={q} className={styles.faqItem}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd) }}
        />
      </section>

      {nearby.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Doanh nghiệp lân cận{company.province ? ` tại ${company.province}` : ""}
          </h2>
          <ul className={styles.nearby}>
            {nearby.map((n) => (
              <li key={n.taxCode}>
                <Link href={`/${n.taxCode}`} className={styles.nearbyCard}>
                  <span className={styles.nearbyName}>{n.name}</span>
                  <span className={styles.nearbyMeta}>MST {n.taxCode}</span>
                  <span className={styles.nearbyMeta}>{n.address}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {company.provinceSlug && company.province && (
        <div className={`${styles.actions} ${styles.hubLink}`}>
          <Link href={`/tinh/${company.provinceSlug}`} className={styles.moreLink}>
            Xem thêm doanh nghiệp tại {company.province} →
          </Link>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dịch vụ cho doanh nghiệp</h2>
        <ul className={styles.services}>
          {SERVICES.map((s) => (
            <li key={s.title} className={styles.serviceCard}>
              <h3 className={styles.serviceTitle}>{s.title}</h3>
              <p className={styles.serviceDesc}>{s.desc}</p>
              <div className={styles.actions}>
                <a href={AFFILIATE_LINKS[s.key].url} target="_blank" rel="noopener noreferrer" className={styles.quoteBtn}>
                  Nhận báo giá
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
