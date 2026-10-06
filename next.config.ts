import type { NextConfig } from "next";

// No CSP here: the app relies on Next's inline bootstrap scripts, Google Fonts via next/font and the
// Turnstile widget; a CSP that doesn't break them needs nonces (middleware) and is a separate change.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const CDN_LIST = "public, s-maxage=86400, stale-while-revalidate=604800";
const CDN_SEARCH = "public, s-maxage=60, stale-while-revalidate=600";
// Cloudflare sits in front of Railway. The container is built in compile mode (no database at build time), so no page is
// prerendered and Next would answer every page "private, no-store". Cache-Control gives Cloudflare the same lifetime live
// gets from Vercel ISR (revalidate 86400); max-age=0 keeps browsers revalidating, like live. Not listed on purpose (live also
// serves them uncached): /tim-kiem (CDN header only), /cap-nhat-ho-so, /yeu-cau-go-thong-tin, /vi-tri-noi-bat, /admin, /api.
const CACHE_LIST = "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";
const CACHE = [{ key: "Cache-Control", value: CACHE_LIST }];
const CACHED_PATHS = [
  "/",
  "/:taxCode(\\d{10}(?:-\\d{3})?)",
  "/danh-ba",
  "/danh-ba/:group",
  "/danh-ba/tinh/:province",
  "/danh-ba/:group/:province",
  "/doanh-nghiep-moi",
  "/doanh-nghiep-moi/:province",
  "/loai-hinh",
  "/loai-hinh/:slug",
  "/nganh",
  "/nganh/:slug",
  "/thong-ke",
  "/thong-ke/:province",
  "/tinh/:slug",
  "/tinh/:slug/nganh/:industry",
  "/trang-thai",
  "/trang-thai/:slug",
  "/trang-thai/mst/:slug",
  "/ma-nganh-2025",
  "/ma-nganh-2025/:slug",
  "/huong-dan",
  "/huong-dan/:slug",
  "/cong-cu",
  "/cong-cu/:slug",
  "/gioi-thieu",
  "/lien-he",
  "/nguon-du-lieu",
  "/phuong-phap-du-lieu",
  "/chinh-sach-bao-mat",
  "/chinh-sach-bien-tap",
  "/dieu-khoan",
];
const CDN = (value: string) => [
  { key: "CDN-Cache-Control", value },
  { key: "Vercel-CDN-Cache-Control", value },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      ...CACHED_PATHS.map((source) => ({ source, headers: CACHE })),
      { source: "/tim-kiem", headers: CDN(CDN_SEARCH) },
      { source: "/tinh/:slug", headers: CDN(CDN_LIST) },
      { source: "/tinh/:slug/nganh/:industry", headers: CDN(CDN_LIST) },
      { source: "/nganh/:slug", headers: CDN(CDN_LIST) },
      { source: "/loai-hinh/:slug", headers: CDN(CDN_LIST) },
      { source: "/trang-thai/:slug", headers: CDN(CDN_LIST) },
      { source: "/doanh-nghiep-moi", headers: CDN(CDN_LIST) },
      { source: "/doanh-nghiep-moi/:province", headers: CDN(CDN_LIST) },
      { source: "/danh-ba/:group/:province", headers: CDN(CDN_LIST) },
    ];
  },
  async redirects() {
    return [
      // Company identity is the tax code: /0101248141-any-slug -> /0101248141 (301). The slug must start
      // with a letter so a 13-digit branch code (0100111948-001) is never treated as a slug.
      { source: "/:mst([0-9]{10})-:slug([A-Za-z][A-Za-z0-9-]*)", destination: "/:mst", permanent: true },
      // Legacy/guessable search URL: send users to the real (noindex) search page, query preserved.
      { source: "/search", destination: "/tim-kiem", permanent: true },
    ];
  },
};

export default nextConfig;
