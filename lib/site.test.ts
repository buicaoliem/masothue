import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSiteUrl, SITE_URL } from "./site";

test("normalizeSiteUrl strips trailing slash", () => {
  assert.equal(normalizeSiteUrl("https://www.masothuedn.com/"), "https://www.masothuedn.com");
});

test("normalizeSiteUrl forces https", () => {
  assert.equal(normalizeSiteUrl("http://www.masothuedn.com"), "https://www.masothuedn.com");
});

test("normalizeSiteUrl forces https and strips trailing slash together", () => {
  assert.equal(normalizeSiteUrl("http://www.masothuedn.com/"), "https://www.masothuedn.com");
});

test("normalizeSiteUrl leaves an already-normalized www URL unchanged", () => {
  assert.equal(normalizeSiteUrl("https://www.masothuedn.com"), "https://www.masothuedn.com");
});

test("normalizeSiteUrl leaves a non-www URL as-is (no host rewriting)", () => {
  assert.equal(normalizeSiteUrl("https://masothuedn.com/"), "https://masothuedn.com");
});

test("SITE_URL is the canonical www host with no trailing slash", () => {
  assert.equal(SITE_URL, "https://www.masothuedn.com");
});
