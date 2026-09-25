import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyIntent } from "./intent";
import { bucketOf, ctrBaseline, ctrFlags, median, mineOpportunities } from "./opportunity";
import { pagePath, parseCtr, parseGscCsv, parseNumber, splitCsv, strip } from "./parse";

// Fixtures below are synthetic parser/logic inputs for tests only; they are not Search Console data.

test("splitCsv handles quotes, embedded commas/newlines and a BOM", () => {
  const rows = splitCsv('﻿a,b\n"x, y","he said ""hi"""\n"multi\nline",z\n');
  assert.deepEqual(rows, [["a", "b"], ["x, y", 'he said "hi"'], ["multi\nline", "z"]]);
});

test("number and CTR parsing across locales", () => {
  assert.equal(parseCtr("12.5%"), 0.125);
  assert.equal(parseCtr("2,5%"), 0.025);
  assert.equal(parseCtr("0.015"), 0.015);
  assert.equal(parseCtr(""), null);
  assert.equal(parseNumber("1,234"), 1234);
  assert.equal(parseNumber("1.234"), 1234);
  assert.equal(parseNumber("12.5"), 12.5);
  assert.equal(parseNumber("12,5"), 12.5);
  assert.equal(parseNumber("abc"), null);
});

test("parseGscCsv: English and Vietnamese headers, kinds, unreadable rows counted", () => {
  const en = parseGscCsv("Top queries,Clicks,Impressions,CTR,Position\nma so thue,10,200,5%,3.2\nbad,x,1,1%,1\n");
  assert.equal(en.kind, "queries");
  assert.equal(en.rows.length, 1);
  assert.equal(en.skipped, 1);
  assert.deepEqual(en.rows[0], { query: "ma so thue", clicks: 10, impressions: 200, ctr: 0.05, position: 3.2 });
  const vi = parseGscCsv("Trang hàng đầu,Số lần nhấp,Lượt hiển thị,CTR,Vị trí trung bình\nhttps://masothuedn.com/nganh/4102-x,5,100,5%,7\n");
  assert.equal(vi.kind, "pages");
  assert.equal(vi.rows[0].page, "https://masothuedn.com/nganh/4102-x");
  const qp = parseGscCsv("Query,Page,Clicks,Impressions,CTR,Position\nq,https://x/a,1,10,10%,2\n");
  assert.equal(qp.kind, "query-page");
  assert.equal(parseGscCsv("foo,bar\n1,2\n").kind, "unknown");
  assert.equal(pagePath("https://masothuedn.com/nganh/4102-x/?utm_source=a#b"), "/nganh/4102-x");
  assert.equal(strip("Mã Số Thuế Đà Nẵng"), "ma so thue da nang");
});

test("intent classification is deterministic and ordered", () => {
  assert.equal(classifyIntent("0101248141"), "tax-code lookup");
  assert.equal(classifyIntent("mã số thuế 0313602877-001"), "tax-code lookup");
  assert.equal(classifyIntent("công ty abc còn hoạt động không"), "company status");
  assert.equal(classifyIntent("giám đốc công ty xyz"), "representative");
  assert.equal(classifyIntent("địa chỉ công ty fpt"), "address");
  assert.equal(classifyIntent("mã ngành 4102 là gì"), "industry");
  assert.equal(classifyIntent("tính thuế tncn 2026"), "tool/calculator");
  assert.equal(classifyIntent("giảm trừ gia cảnh 2026"), "tax/accounting");
  assert.equal(classifyIntent("mã số thuế là gì"), "legal/how-to");
  assert.equal(classifyIntent("doanh nghiệp tại hà nội"), "province");
  assert.equal(classifyIntent("công ty tnhh thương mại abc"), "company lookup");
  assert.equal(classifyIntent("thời tiết hôm nay"), "other");
  assert.equal(classifyIntent(""), "other");
});

test("buckets, median and the site's own CTR baseline", () => {
  assert.equal(bucketOf(2.4), "1-3");
  assert.equal(bucketOf(5), "4-6");
  assert.equal(bucketOf(9), "7-10");
  assert.equal(bucketOf(15), "11-20");
  assert.equal(bucketOf(40), "21+");
  assert.equal(median([1, 3, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  const rows = [
    { page: "/a", clicks: 10, impressions: 100, ctr: 0.1, position: 2 },
    { page: "/b", clicks: 30, impressions: 100, ctr: 0.3, position: 2 },
    { page: "/c", clicks: 1, impressions: 100, ctr: 0.01, position: 2 },
  ];
  assert.equal(ctrBaseline(rows)["1-3"], 0.1);
});

test("mineOpportunities finds striking distance, low CTR, zero-click pages, cannibalization and content gaps", () => {
  const rows = [
    { query: "mã ngành 4102", page: "https://masothuedn.com/nganh/4102-x", clicks: 0, impressions: 300, ctr: 0, position: 8 },
    { query: "tra cứu mst", page: "https://masothuedn.com/", clicks: 20, impressions: 400, ctr: 0.05, position: 2 },
    { query: "tra cứu mst 2", page: "https://masothuedn.com/x", clicks: 40, impressions: 400, ctr: 0.1, position: 2 },
    { query: "tra cứu mst 3", page: "https://masothuedn.com/y", clicks: 4, impressions: 400, ctr: 0.01, position: 2 },
    { query: "mã số thuế công ty abc", page: "https://masothuedn.com/tinh/ha-noi", clicks: 0, impressions: 120, ctr: 0, position: 12 },
    { query: "mã số thuế công ty abc", page: "https://masothuedn.com/0101248141", clicks: 0, impressions: 100, ctr: 0, position: 14 },
    { query: "x", page: "https://masothuedn.com/z", clicks: 0, impressions: 5, ctr: 0, position: 1 },
  ];
  const { opportunities, baseline } = mineOpportunities(rows);
  const kinds = new Set(opportunities.map((o) => o.kind));
  for (const k of ["striking-distance", "low-ctr", "zero-click-page", "cannibalization", "no-landing-page"]) assert.ok(kinds.has(k as never), k);
  assert.ok(baseline["1-3"] > 0);
  assert.ok(!opportunities.some((o) => o.query === "x"), "below the impression floor is ignored");
  assert.deepEqual([...opportunities].map((o) => o.score), [...opportunities].map((o) => o.score).sort((a, b) => b - a), "sorted by score");
});

test("ctrFlags: only good-position pages with enough impressions below the site median", () => {
  const pages = [
    { page: "https://x/a", clicks: 5, impressions: 1000, ctr: 0.005, position: 2 },
    { page: "https://x/b", clicks: 100, impressions: 1000, ctr: 0.1, position: 2 },
    { page: "https://x/c", clicks: 60, impressions: 1000, ctr: 0.06, position: 2 },
    { page: "https://x/d", clicks: 0, impressions: 100, ctr: 0, position: 2 },
    { page: "https://x/e", clicks: 0, impressions: 1000, ctr: 0, position: 30 },
  ];
  const { flags } = ctrFlags(pages);
  assert.deepEqual(flags.map((f) => f.page), ["/a"]);
  assert.ok(flags[0].potentialClicks > 0);
});
