import assert from "node:assert/strict";
import { test } from "node:test";
import { SITE_URL } from "./site";
import { pagesSitemapUrl, companySitemapUrl } from "./sitemap";

test("pages sitemap URL starts with the canonical host", () => {
  assert.ok(pagesSitemapUrl.startsWith(SITE_URL));
});

test("company sitemap URLs start with the canonical host", () => {
  for (let page = 0; page < 5; page++) {
    assert.ok(companySitemapUrl(page).startsWith(SITE_URL));
  }
});
