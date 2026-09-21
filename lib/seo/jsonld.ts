import { SITE_NAME, SITE_URL } from "@/lib/site";
import { absoluteUrl } from "./urls";

export type Crumb = { name: string; path: string };

/** Home is always the first crumb; the last crumb is the current page. */
export function withHome(crumbs: Crumb[]): Crumb[] {
  return [{ name: "Trang chủ", path: "/" }, ...crumbs];
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: "vi",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/tim-kiem?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon-512.png`,
  };
}

export function articleJsonLd(a: { slug: string; title: string; description: string; published: string; modified: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    mainEntityOfPage: absoluteUrl(`/huong-dan/${a.slug}`),
    datePublished: a.published,
    dateModified: a.modified,
    inLanguage: "vi",
    author: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` },
    publisher: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` },
  };
}

/** Serializes for an inline <script>; "<" is escaped so data can never close the tag. */
export const serializeJsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");
