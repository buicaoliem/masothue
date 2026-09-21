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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
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
