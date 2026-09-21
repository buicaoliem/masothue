import assert from "node:assert/strict";
import { test } from "node:test";
import { SITE_URL } from "./site";
import { buildSitemapIndex, buildUrlset, companySitemapUrl, SITEMAP_PAGE_SIZE, SITEMAP_SECTIONS, sectionSitemapUrl, toSitemapUrls } from "./sitemap";

test("section and company sitemap URLs start with the canonical host", () => {
  for (const s of SITEMAP_SECTIONS) assert.ok(sectionSitemapUrl(s).startsWith(`${SITE_URL}/sitemaps/`));
  for (let page = 0; page < 5; page++) assert.ok(companySitemapUrl(page).startsWith(SITE_URL));
});

test("sitemap sections are unique and never include search", () => {
  assert.equal(new Set(SITEMAP_SECTIONS).size, SITEMAP_SECTIONS.length);
  assert.ok(!SITEMAP_SECTIONS.some((s) => /search|tim-kiem/.test(s)));
});

test("toSitemapUrls dedupes and prefixes the canonical host", () => {
  assert.deepEqual(toSitemapUrls(["/a", "/a", "/b"]), [`${SITE_URL}/a`, `${SITE_URL}/b`]);
});

test("toSitemapUrls rejects query strings and fragments", () => {
  assert.throws(() => toSitemapUrls(["/tinh/ha-noi?trang=2"]));
  assert.throws(() => toSitemapUrls(["/a#x"]));
});

test("toSitemapUrls refuses to exceed the per-file cap", () => {
  const paths = Array.from({ length: SITEMAP_PAGE_SIZE + 1 }, (_, i) => `/c/${i}`);
  assert.throws(() => toSitemapUrls(paths));
  assert.equal(toSitemapUrls(paths.slice(0, SITEMAP_PAGE_SIZE)).length, SITEMAP_PAGE_SIZE);
});

test("buildUrlset escapes XML and only emits lastmod when given", () => {
  const xml = buildUrlset([{ loc: "https://x/a&b" }, { loc: "https://x/c", lastmod: "2026-01-01T00:00:00.000Z" }]);
  assert.match(xml, /<loc>https:\/\/x\/a&amp;b<\/loc><\/url>/);
  assert.match(xml, /<lastmod>2026-01-01T00:00:00.000Z<\/lastmod>/);
  assert.equal((xml.match(/<lastmod>/g) ?? []).length, 1);
});

test("buildSitemapIndex lists every child", () => {
  const xml = buildSitemapIndex(["https://x/1.xml", "https://x/2.xml"]);
  assert.equal((xml.match(/<sitemap>/g) ?? []).length, 2);
});
