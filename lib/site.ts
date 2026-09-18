// Strips a trailing slash and forces https, so a value with or without
// "www." / a trailing slash always normalizes to the same origin.
export function normalizeSiteUrl(url: string): string {
  const withHttps = url.replace(/^http:\/\//, "https://");
  return withHttps.replace(/\/+$/, "");
}

// Canonical origin for absolute URLs (canonical, sitemap, structured data).
// Must match the host production actually serves (masothuedn.com redirects
// here with a 308, so sitemap/canonical URLs have to point at www directly).
export const SITE_URL = normalizeSiteUrl("https://www.masothuedn.com");
export const SITE_NAME = "masothuedn.com";

// Shown on legal pages. Falls back to a generic name/contact when unset.
export const OPERATOR_NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME || "Ban quản trị masothuedn.com";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || null;
