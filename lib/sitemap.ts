import { prisma } from "@/pipeline/db";
import { SITE_URL } from "@/lib/site";
import { LISTABLE } from "@/lib/company";

// Protocol limit is 50,000 URLs per sitemap file.
export const SITEMAP_PAGE_SIZE = 50_000;

export const pagesSitemapUrl = `${SITE_URL}/sitemaps/pages.xml`;
export const companySitemapUrl = (page: number) => `${SITE_URL}/sitemaps/companies-${page}.xml`;

export async function countSitemapPages(): Promise<number> {
  const total = await prisma.company.count({ where: LISTABLE });
  return Math.max(1, Math.ceil(total / SITEMAP_PAGE_SIZE));
}

export function getSitemapPage(page: number) {
  return prisma.company.findMany({
    where: LISTABLE,
    select: { taxCode: true, updatedAt: true },
    orderBy: { taxCode: "asc" },
    skip: page * SITEMAP_PAGE_SIZE,
    take: SITEMAP_PAGE_SIZE,
  });
}

const XML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
export const xmlEscape = (s: string) => s.replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch]);

export function xmlResponse(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
