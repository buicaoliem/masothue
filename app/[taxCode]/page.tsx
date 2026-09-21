import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompanySafe, getNearbyCompanies, TAX_CODE_RE } from "@/lib/company";
import { getCompanyIndustries } from "@/lib/industry/service";
import { isCompanyProfileIndexable } from "@/lib/seo/indexability";
import { buildCompanyMetadata, buildPageMetadata } from "@/lib/seo/metadata";
import { industryPath, legalFormPath, provincePath, statusPath } from "@/lib/seo/urls";
import { classifyStatus, legalFormSlug } from "@/lib/seo/taxonomy";
import { Breadcrumb } from "../components/Breadcrumb";
import { serializeJsonLd } from "@/lib/seo/jsonld";
import { findDirectoryGroup, type PublicProfile } from "@/lib/directory";
import { getSameGroupProfiles } from "@/lib/directory-web";
import { PROVINCES } from "@/pipeline/province";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { OPENDATA_PUBLISHERS } from "@/lib/opendata-sources";
import { statusTone } from "@/lib/company-status";
import { AFFILIATE_LINKS, type ServiceKey } from "@/lib/config";
import { REL_EXTERNAL_SPONSORED, REL_EXTERNAL_UGC } from "@/lib/relAttrs";
import { LogoTile } from "../components/LogoTile";
import { CopyButton } from "./CopyButton";
import { getProfileOnce, loadCompanyPageData } from "./data";
import styles from "./company.module.css";
import dirStyles from "../components/directory.module.css";
import siteStyles from "../components/site.module.css";

type Props = { params: Promise<{ taxCode: string }> };
type Company = NonNullable<Awaited<ReturnType<typeof getCompanySafe>>>;

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
  const [company, profile] = await Promise.all([getCompanySafe(taxCode), getProfileOnce(taxCode)]);
  if (!company && !profile) return {};
  if (company) return buildCompanyMetadata({ taxCode: company.taxCode, name: company.name }, isCompanyProfileIndexable(company));
  // Directory-only page (no registry row): indexable only when the approved profile passes the directory rule.
  const { name } = resolveDisplay(company, profile);
  return buildPageMetadata({
    title: `${taxCode} - ${name} | Mã số thuế`,
    description: profile!.description,
    path: `/${taxCode}`,
    index: true,
  });
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

const jsonLd = serializeJsonLd;

// Static service strip; link targets live in lib/config.ts.
const SERVICES: { key: ServiceKey; title: string; desc: string }[] = [
  { key: "digitalSignature", title: "Chữ ký số", desc: "Ký số tờ khai thuế, hóa đơn và hợp đồng điện tử." },
  { key: "eInvoice", title: "Hóa đơn điện tử", desc: "Phát hành hóa đơn điện tử đúng quy định." },
  { key: "website", title: "Thiết kế website", desc: "Website giới thiệu doanh nghiệp chuẩn di động." },
];

function Missing() {
  return <span className={dirStyles.missing}>Chưa có dữ liệu</span>;
}

/** Attribution for rows filled from a provincial open-data file (Company.dataSource). */
function SourceNote({ company }: { company: Company | null }) {
  const publisher = company?.dataSource ? OPENDATA_PUBLISHERS[company.dataSource] : undefined;
  if (!publisher) return null;
  return (
    <p className={dirStyles.note}>
      Nguồn: dữ liệu mở của {publisher}
      {company?.dataAsOf ? `, cập nhật đến ${formatDate(company.dataAsOf)}` : ""}. Địa chỉ ghi theo địa giới trước ngày
      01/07/2025; tình trạng có thể đã thay đổi.
    </p>
  );
}

/** Only real timestamps: the source dataset date, else the last time this system synced the record. */
function Freshness({ company }: { company: Company | null }) {
  if (!company) return null;
  if (company.dataAsOf) return <p className={dirStyles.note}>Cập nhật dữ liệu gần nhất: {formatDate(company.dataAsOf)} (ngày dữ liệu của nguồn).</p>;
  if (company.lastEnrichedAt) {
    return <p className={dirStyles.note}>Thời điểm hệ thống đồng bộ gần nhất: {formatDate(company.lastEnrichedAt)}.</p>;
  }
  return null;
}

function badgeClass(status: string): string {
  const tone = statusTone(status);
  return tone === "active" ? dirStyles.badgeOk : dirStyles.badgeOff;
}

/** Status text as shown to users; rows filled from a provincial open-data file (Company.dataSource) note their source. */
function displayStatus(c: Company): string | null {
  if (!c.status) return null;
  return c.dataSource ? `${c.status} (theo đăng ký kinh doanh)` : c.status;
}

export default async function CompanyPage({ params }: Props) {
  const { taxCode } = await params;
  // The industries query needs only the tax code, so it starts now and overlaps the company/profile reads.
  const industriesPromise = TAX_CODE_RE.test(taxCode)
    ? getCompanyIndustries(taxCode).catch((err) => {
        console.error("industries lookup failed", err instanceof Error ? err.message : err);
        return null;
      })
    : Promise.resolve(null);
  const data = await loadCompanyPageData(taxCode);
  if (data.notFound) notFound();
  const { company, profile, isPaid } = data;

  const group = profile ? findDirectoryGroup(profile.groupSlug) : null;
  // Everything left is independent given the company row: one round trip, not three.
  const [sameGroup, industriesRaw, nearby] = await Promise.all([
    profile ? getSameGroupProfiles(profile.groupSlug, profile.provinceSlug, taxCode, 6) : Promise.resolve([]),
    industriesPromise,
    company?.provinceSlug ? getNearbyCompanies(company.provinceSlug, company.taxCode) : Promise.resolve([]),
  ]);

  const { name, address, province } = resolveDisplay(company, profile);
  const displayTaxCode = company?.taxCode ?? profile?.mst ?? taxCode;

  const industries = company ? industriesRaw : null;
  // Unified view over CompanyIndustry + the compact registered-industry sets (see lib/industry/service.ts).
  const primaryIndustry = industries?.primary ?? null;
  const otherIndustries = industries?.registered ?? [];
  const shownOtherIndustries = otherIndustries.slice(0, 20);
  const legalSlug = company?.legalType ? legalFormSlug(company.legalType) : "";
  const statusPage = company?.status ? classifyStatus(company.status) : undefined;
  const provinceSlug = company?.provinceSlug ?? profile?.provinceSlug ?? null;

  // Optional rows appear only when the source provided the field; nothing is inferred.
  const kvRows: [string, ReactNode][] = [
    ["Mã số thuế", displayTaxCode],
    ...(company?.nameForeign ? ([["Tên quốc tế", company.nameForeign]] as [string, ReactNode][]) : []),
    ...(company?.nameShort ? ([["Tên viết tắt", company.nameShort]] as [string, ReactNode][]) : []),
    [
      "Tình trạng",
      company?.status ? (
        statusPage ? <Link href={statusPath(statusPage.slug)}>{displayStatus(company)}</Link> : displayStatus(company)
      ) : (
        <Missing />
      ),
    ],
    ["Ngày thành lập", company?.activeDate ? formatDate(company.activeDate) : <Missing />],
    [
      "Địa chỉ trụ sở",
      address ? (
        <>
          {address}
          {provinceSlug && province && (
            <>
              {" "}
              (<Link href={provincePath(provinceSlug)}>{province}</Link>)
            </>
          )}
        </>
      ) : (
        <Missing />
      ),
    ],
    ["Người đại diện", company?.representativeName ?? <Missing />],
    ...(primaryIndustry || company?.mainIndustry || otherIndustries.length === 0
      ? ([
          [
            "Ngành nghề chính",
            primaryIndustry ? (
              <Link href={industryPath(primaryIndustry.code, primaryIndustry.name)}>
                {primaryIndustry.code} - {primaryIndustry.name}
              </Link>
            ) : company?.mainIndustry ? (
              company.mainIndustry
            ) : (
              <Missing />
            ),
          ],
        ] as [string, ReactNode][])
      : []),
    [
      "Loại hình",
      company?.legalType ? legalSlug ? <Link href={legalFormPath(legalSlug)}>{company.legalType}</Link> : company.legalType : <Missing />,
    ],
    ...(company?.taxOffice ? ([["Cơ quan thuế quản lý", company.taxOffice]] as [string, ReactNode][]) : []),
  ];

  const invoiceRows: [string, string][] = company ? [["Tên công ty", company.name], ["Mã số thuế", company.taxCode], ["Địa chỉ", company.address]] : [];

  const faq = company ? buildFaq(company) : [];

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

      <Breadcrumb
        items={[
          ...(provinceSlug && province ? [{ name: province, path: provincePath(provinceSlug) }] : []),
          ...(profile && group ? [{ name: group.label, path: `/danh-ba/${profile.groupSlug}/${profile.provinceSlug}` }] : []),
          { name, path: `/${displayTaxCode}` },
        ]}
      />

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
                  · <span className={`${dirStyles.badge} ${badgeClass(company.status)}`}>{displayStatus(company)}</span>
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
                <a href={profile.website} target="_blank" rel={REL_EXTERNAL_SPONSORED} className={`${dirStyles.btn} ${dirStyles.btnGhost}`}>
                  Website
                </a>
              )}
              {profile.publicZalo && (
                <a
                  href={`https://zalo.me/${profile.publicZalo}`}
                  target="_blank"
                  rel={REL_EXTERNAL_SPONSORED}
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
              <SourceNote company={company} />
              <Freshness company={company} />
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
            {company?.status && <span className={`${styles.badge} ${styles[statusTone(company.status)]}`}>{displayStatus(company)}</span>}
            {profile?.description && <p className={dirStyles.pheadLead}>{profile.description}</p>}
            {profile && (profile.publicPhone || profile.website || profile.publicZalo) && (
              <div className={`${dirStyles.act} ${dirStyles.pheadAct}`}>
                {profile.publicPhone && (
                  <a href={`tel:${profile.publicPhone}`} className={`${dirStyles.btn} ${dirStyles.btnGhost}`}>
                    Gọi điện
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel={REL_EXTERNAL_UGC} className={`${dirStyles.btn} ${dirStyles.btnGhost}`}>
                    Website
                  </a>
                )}
                {profile.publicZalo && (
                  <a
                    href={`https://zalo.me/${profile.publicZalo}`}
                    target="_blank"
                    rel={REL_EXTERNAL_UGC}
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
          <SourceNote company={company} />
          <Freshness company={company} />
          {shownOtherIndustries.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{primaryIndustry ? "Ngành nghề đăng ký khác" : "Ngành nghề đăng ký"}</h2>
              <ul>
                {shownOtherIndustries.map((i) => (
                  <li key={i.code}>
                    <Link href={industryPath(i.code, i.name)}>
                      {i.code} - {i.name}
                    </Link>
                  </li>
                ))}
              </ul>
              {otherIndustries.length > shownOtherIndustries.length && (
                <p className={dirStyles.note}>Và {otherIndustries.length - shownOtherIndustries.length} ngành khác theo đăng ký.</p>
              )}
              {!primaryIndustry && <p className={dirStyles.note}>Nguồn dữ liệu không cho biết ngành chính của doanh nghiệp này.</p>}
            </section>
          )}

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
              <Link href={`/doanh-nghiep-moi/${company.provinceSlug}`} className={styles.moreLink}>
                Doanh nghiệp mới tại {company.province} →
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
                    <a href={AFFILIATE_LINKS[s.key].url} target="_blank" rel={REL_EXTERNAL_SPONSORED} className={styles.quoteBtn}>
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
        Thông tin lấy từ nguồn đăng ký doanh nghiệp công khai, chưa được xác minh riêng (xem <Link href="/nguon-du-lieu">nguồn dữ liệu</Link>). Chủ doanh nghiệp có thể{" "}
        <Link href={`/yeu-cau-go-thong-tin?mst=${displayTaxCode}`}>yêu cầu gỡ thông tin</Link>.
      </p>
    </main>
  );
}
