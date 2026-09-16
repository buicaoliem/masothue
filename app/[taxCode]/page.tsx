import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompanySafe, getNearbyCompanies } from "@/lib/company";
import { findDirectoryGroup, getActivePlacements, getProfile, type PublicProfile } from "@/lib/directory";
import { getSameGroupProfiles } from "@/lib/directory-web";
import { PROVINCES } from "@/pipeline/province";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { AFFILIATE_LINKS, type ServiceKey } from "@/lib/config";
import { LogoTile } from "../components/LogoTile";
import { CopyButton } from "./CopyButton";
import styles from "./company.module.css";
import dirStyles from "../components/directory.module.css";
import siteStyles from "../components/site.module.css";

type Props = { params: Promise<{ taxCode: string }> };
type Company = NonNullable<Awaited<ReturnType<typeof getCompanySafe>>>;

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

/** Name/address/province, preferring the registry row and falling back to the approved profile. */
function resolveDisplay(company: Company | null, profile: PublicProfile | null) {
  const name = company?.name ?? profile?.companyName ?? "";
  const address = company?.address ?? profile?.address ?? "";
  const provinceSlug = company?.provinceSlug ?? profile?.provinceSlug ?? null;
  const province = company?.province ?? (provinceSlug ? PROVINCES.find((p) => p.slug === provinceSlug)?.displayName ?? null : null);
  return { name, address, province, provinceSlug };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { taxCode } = await params;
  const [company, profile] = await Promise.all([getCompanySafe(taxCode), getProfile(taxCode)]);
  if (!company && !profile) return {};
  const url = `${SITE_URL}/${taxCode}`;
  if (company) {
    const title = `${company.name} - Mã số thuế ${company.taxCode} | ${SITE_NAME}`;
    const description = buildDescription(company);
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, siteName: SITE_NAME, type: "website", locale: "vi_VN" },
    };
  }
  const { name } = resolveDisplay(company, profile);
  const title = `${name} - Mã số thuế ${taxCode} | ${SITE_NAME}`;
  const description = profile!.description;
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

function Missing() {
  return <span className={dirStyles.missing}>Chưa có dữ liệu</span>;
}

function badgeClass(status: string): string {
  const tone = statusTone(status);
  return tone === "active" ? dirStyles.badgeOk : dirStyles.badgeOff;
}

export default async function CompanyPage({ params }: Props) {
  const { taxCode } = await params;
  const [company, profile] = await Promise.all([getCompanySafe(taxCode), getProfile(taxCode)]);
  if (!company && !profile) notFound();

  const group = profile ? findDirectoryGroup(profile.groupSlug) : null;
  const [placements, sameGroup] = await Promise.all([
    profile ? getActivePlacements(profile.groupSlug, profile.provinceSlug) : Promise.resolve([]),
    profile ? getSameGroupProfiles(profile.groupSlug, profile.provinceSlug, taxCode, 6) : Promise.resolve([]),
  ]);
  const isPaid = profile !== null && placements.some((p) => p.mst === profile.mst);

  const { name, address, province } = resolveDisplay(company, profile);
  const displayTaxCode = company?.taxCode ?? profile?.mst ?? taxCode;

  const kvRows: [string, ReactNode][] = [
    ["Mã số thuế", displayTaxCode],
    ["Tình trạng", company?.status ?? <Missing />],
    ["Ngày thành lập", company?.activeDate ? formatDate(company.activeDate) : <Missing />],
    ["Địa chỉ trụ sở", address || <Missing />],
    ["Người đại diện", company?.representativeName ?? <Missing />],
    ["Ngành nghề chính", company?.mainIndustry ?? <Missing />],
  ];

  const invoiceRows: [string, string][] = company ? [["Tên công ty", company.name], ["Mã số thuế", company.taxCode], ["Địa chỉ", company.address]] : [];

  const faq = company ? buildFaq(company) : [];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const nearby = company?.provinceSlug ? await getNearbyCompanies(company.provinceSlug, company.taxCode) : [];

  return (
    <main className={styles.page}>
      {company && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(buildOrganizationJsonLd(company)) }} />
      )}

      <div className={styles.removalLink}>
        <Link href={`/yeu-cau-go-thong-tin?mst=${displayTaxCode}`} rel="nofollow">
          Yêu cầu gỡ thông tin
        </Link>
      </div>

      {profile && group && (
        <div className={dirStyles.crumb}>
          <Link href="/">Trang chủ</Link> / <Link href={`/danh-ba/tinh/${profile.provinceSlug}`}>{province}</Link> /{" "}
          <Link href={`/danh-ba/${profile.groupSlug}/${profile.provinceSlug}`}>{group.label}</Link>
        </div>
      )}

      {isPaid && profile ? (
        <div className={`${dirStyles.pp} ${dirStyles.ppPaid}`}>
          <div className={`${dirStyles.phead} ${dirStyles.pheadPaid}`}>
            <LogoTile mst={profile.mst} name={profile.companyName} logoUrl={profile.logoUrl} size="lg" />
            <span className={`${dirStyles.badge} ${dirStyles.badgeGold}`}>Đứng đầu ngành</span>
            <h1 className={styles.name}>{name}</h1>
            <p className={dirStyles.pheadMeta}>
              MST {displayTaxCode}
              {company?.status && (
                <>
                  {" "}
                  · <span className={`${dirStyles.badge} ${badgeClass(company.status)}`}>{company.status}</span>
                </>
              )}
            </p>
            <p className={dirStyles.pheadLead}>{profile.description}</p>
            <div className={`${dirStyles.act} ${dirStyles.pheadAct}`}>
              {profile.publicPhone && (
                <a href={`tel:${profile.publicPhone}`} className={`${dirStyles.btn} ${dirStyles.btnGhost}`}>
                  Gọi điện
                </a>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className={`${dirStyles.btn} ${dirStyles.btnGhost}`}>
                  Website
                </a>
              )}
              {profile.publicZalo && (
                <a
                  href={`https://zalo.me/${profile.publicZalo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${dirStyles.btn} ${dirStyles.btnGold}`}
                >
                  Nhắn Zalo
                </a>
              )}
            </div>
          </div>
          <div className={dirStyles.pbody}>
            {profile.services.length > 0 && (
              <div className={dirStyles.sec}>
                <h2>Dịch vụ</h2>
                <ul className={dirStyles.services}>
                  {profile.services.map((s, i) => (
                    <li key={i} className={dirStyles.svc}>
                      <span className={dirStyles.svcName}>{s.name}</span>
                      {s.detail && <span className={dirStyles.svcDetail}>{s.detail}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className={dirStyles.sec}>
              <h2>Thông tin đăng ký</h2>
              <dl className={dirStyles.kv}>
                {kvRows.map(([label, value]) => (
                  <Fragment key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
          </div>
        </div>
      ) : (
        <>
          <header className={styles.header}>
            <h1 className={styles.name}>{name}</h1>
            <p className={styles.taxCode}>
              Mã số thuế: <strong>{displayTaxCode}</strong>
            </p>
            {company?.status && <span className={`${styles.badge} ${styles[statusTone(company.status)]}`}>{company.status}</span>}
            {profile?.description && <p className={dirStyles.pheadLead}>{profile.description}</p>}
            {profile && (profile.publicPhone || profile.website || profile.publicZalo) && (
              <div className={`${dirStyles.act} ${dirStyles.pheadAct}`}>
                {profile.publicPhone && (
                  <a href={`tel:${profile.publicPhone}`} className={`${dirStyles.btn} ${dirStyles.btnGhost}`}>
                    Gọi điện
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className={`${dirStyles.btn} ${dirStyles.btnGhost}`}>
                    Website
                  </a>
                )}
                {profile.publicZalo && (
                  <a
                    href={`https://zalo.me/${profile.publicZalo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${dirStyles.btn} ${dirStyles.btnGhost}`}
                  >
                    Nhắn Zalo
                  </a>
                )}
              </div>
            )}
          </header>

          {profile?.services && profile.services.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Dịch vụ</h2>
              <ul className={dirStyles.services}>
                {profile.services.map((s, i) => (
                  <li key={i} className={dirStyles.svc}>
                    <span className={dirStyles.svcName}>{s.name}</span>
                    {s.detail && <span className={dirStyles.svcDetail}>{s.detail}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <dl className={dirStyles.kv}>
            {kvRows.map(([label, value]) => (
              <Fragment key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </Fragment>
            ))}
          </dl>

          <div className={dirStyles.claimBox}>
            <p>
              <strong>Bạn là chủ doanh nghiệp này?</strong> Thêm ngành nghề, dịch vụ, số điện thoại để khách hàng liên hệ được.
              Miễn phí.
            </p>
            <div className={dirStyles.act}>
              <Link href={`/cap-nhat-ho-so?mst=${displayTaxCode}`} className={dirStyles.btn}>
                Cập nhật hồ sơ
              </Link>
            </div>
          </div>
          <div className={dirStyles.upsellBox}>
            <p>Muốn xuất hiện trong khối &quot;Đứng đầu ngành&quot; với logo và nút Nhắn Zalo?</p>
            <div className={dirStyles.act}>
              <Link href={`/vi-tri-noi-bat?mst=${displayTaxCode}`} className={`${dirStyles.btn} ${dirStyles.btnGold}`}>
                Xem gói nổi bật
              </Link>
            </div>
          </div>

          {company && (
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
          )}

          {company && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Tóm tắt</h2>
              <p className={styles.summary}>{buildSummary(company)}</p>
            </section>
          )}

          {company && faq.length > 0 && (
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
              <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd) }} />
            </section>
          )}

          {nearby.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Doanh nghiệp lân cận{company?.province ? ` tại ${company.province}` : ""}</h2>
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

          {company?.provinceSlug && company.province && (
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
        </>
      )}

      {profile && sameGroup.length > 0 && (
        <div className={dirStyles.same}>
          <h2>Doanh nghiệp cùng ngành</h2>
          <div className={siteStyles.chips}>
            {sameGroup.map((p) => (
              <Link key={p.mst} href={`/${p.mst}`} className={siteStyles.chip}>
                {p.companyName}
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className={dirStyles.note}>
        Thông tin lấy từ nguồn đăng ký doanh nghiệp công khai. Chủ doanh nghiệp có thể{" "}
        <Link href={`/yeu-cau-go-thong-tin?mst=${displayTaxCode}`}>yêu cầu gỡ thông tin</Link>.
      </p>
    </main>
  );
}
