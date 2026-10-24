import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Crawl budget: Googlebot renders pages and then fetches the React Server Component payload of every link it sees
// (`?_rsc=…`, text/x-component). Those are not pages and were ~89% of its fetches, so they are disallowed. Page HTML,
// /_next/static CSS/JS (needed to render) and images stay allowed. The form pages linked with `?mst=` from every
// company page are noindex utilities; their query variants are disallowed too (the bare paths stay crawlable).
// /tim-kiem stays crawlable on purpose: Google must be able to read its noindex.
export const DISALLOW = [
  "/admin",
  "/*?_rsc=",
  "/*&_rsc=",
  "/cap-nhat-ho-so?",
  "/yeu-cau-go-thong-tin?",
  "/vi-tri-noi-bat?",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: DISALLOW },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
