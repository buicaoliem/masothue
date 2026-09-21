import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { absoluteUrl, companyPath, provincePath } from "./urls";

export const DESCRIPTION_MAX = 160;

/** Cuts at a word boundary so a description never runs past ~160 chars. */
export function truncateDescription(text: string, max = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s.,:;-]+$/, "")}…`;
}

type BuildInput = {
  /** Full <title>, already including any suffix. */
  title: string;
  description: string;
  /** Site-relative canonical path; never contains tracking/facet params. */
  path: string;
  index: boolean;
  type?: "website" | "article";
};

/** Base builder every page-specific helper goes through: title, description, canonical, robots, OG, Twitter. */
export function buildPageMetadata({ title, description, path, index, type = "website" }: BuildInput): Metadata {
  const url = absoluteUrl(path);
  const desc = truncateDescription(description);
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title, description: desc, url, siteName: SITE_NAME, type, locale: "vi_VN" },
    twitter: { card: "summary", title, description: desc },
  };
}

/** Non-indexable utility pages (search, forms): noindex,follow and NO canonical to another URL. */
export function buildNoindexMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: true } };
}

export function buildCompanyMetadata(c: { taxCode: string; name: string }, index: boolean): Metadata {
  return buildPageMetadata({
    title: `${c.taxCode} - ${c.name} | Mã số thuế`,
    description: `Tra cứu mã số thuế ${c.taxCode} - ${c.name}: địa chỉ, người đại diện, tình trạng hoạt động, ngành nghề, cơ quan thuế và thông tin doanh nghiệp cập nhật.`,
    path: companyPath(c.taxCode),
    index,
  });
}

const pageSuffix = (page: number) => (page > 1 ? ` - Trang ${page}` : "");

export function buildProvinceMetadata(p: { slug: string; displayName: string }, page: number, index: boolean): Metadata {
  return buildPageMetadata({
    title: `Mã số thuế doanh nghiệp tại ${p.displayName}${pageSuffix(page)} | ${SITE_NAME}`,
    description: `Danh sách doanh nghiệp tại ${p.displayName}: mã số thuế, địa chỉ, tình trạng hoạt động, ngành phổ biến và doanh nghiệp mới thành lập.`,
    path: provincePath(p.slug, page),
    index,
  });
}

export function buildIndustryMetadata(i: { path: string; code: string; name: string }, page: number, index: boolean): Metadata {
  return buildPageMetadata({
    title: `Doanh nghiệp ngành ${i.code} - ${i.name}${pageSuffix(page)} | ${SITE_NAME}`,
    description: `Danh sách doanh nghiệp đăng ký ngành ${i.code} - ${i.name}: mã số thuế, địa chỉ, phân bố theo tỉnh, thành phố và doanh nghiệp mới.`,
    path: page > 1 ? `${i.path}?trang=${page}` : i.path,
    index,
  });
}

export function buildTaxonomyMetadata(o: { title: string; description: string; path: string; page: number; index: boolean }): Metadata {
  return buildPageMetadata({
    title: `${o.title}${pageSuffix(o.page)} | ${SITE_NAME}`,
    description: o.description,
    path: o.page > 1 ? `${o.path}?trang=${o.page}` : o.path,
    index: o.index,
  });
}

export function buildGuideMetadata(g: { slug: string; title: string; description: string }): Metadata {
  return buildPageMetadata({
    title: `${g.title} | ${SITE_NAME}`,
    description: g.description,
    path: `/huong-dan/${g.slug}`,
    index: true,
    type: "article",
  });
}

/** Static informational pages (about, methodology…). */
export function buildStaticMetadata(o: { title: string; description: string; path: string }): Metadata {
  return buildPageMetadata({ title: `${o.title} | ${SITE_NAME}`, description: o.description, path: o.path, index: true });
}
