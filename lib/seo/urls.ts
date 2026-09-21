import { SITE_URL } from "@/lib/site";
import { slugify } from "./slug";

// Single source of truth for every indexable path. Company identity is the tax code; the name
// never takes part in the URL, so the canonical does not depend on it.

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;

export const companyPath = (taxCode: string) => `/${taxCode}`;
export const provincePath = (slug: string, page = 1) => (page > 1 ? `/tinh/${slug}?trang=${page}` : `/tinh/${slug}`);
export const industrySlug = (code: string, name: string) => `${code}-${slugify(name)}`;
export const industryPath = (code: string, name: string) => `/nganh/${industrySlug(code, name)}`;
export const legalFormPath = (slug: string) => `/loai-hinh/${slug}`;
export const statusPath = (slug: string) => `/trang-thai/${slug}`;
export const provinceIndustryPath = (provinceSlug: string, code: string, name: string) =>
  `/tinh/${provinceSlug}/nganh/${industrySlug(code, name)}`;
export const newCompaniesPath = (provinceSlug?: string) => (provinceSlug ? `/doanh-nghiep-moi/${provinceSlug}` : "/doanh-nghiep-moi");
export const statsPath = (segment?: string) => (segment ? `/thong-ke/${segment}` : "/thong-ke");
export const guidePath = (slug: string) => `/huong-dan/${slug}`;

/** Splits "6201-lap-trinh-may-vi-tinh" into its code and slug part; null when there is no numeric code. */
export function parseIndustrySlug(param: string): { code: string; slug: string } | null {
  const m = /^(\d{2,5})(?:-([a-z0-9-]*))?$/.exec(param);
  return m ? { code: m[1], slug: m[2] ?? "" } : null;
}

/** 1-based page from ?trang=; null for anything that is not a plain positive integer. */
export function parsePage(raw: string | string[] | undefined): number | null {
  if (raw === undefined) return 1;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return /^[1-9]\d{0,5}$/.test(v) ? Number(v) : null;
}
