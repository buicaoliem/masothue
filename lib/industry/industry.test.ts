import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEnrichUpdate } from "@/pipeline/enrich";
import type { CompanyData } from "@/pipeline/sources/types";
import { companyLastmod } from "@/lib/sitemap";
import { validateMst } from "@/lib/tools/mst";
import { TAX_CODE_RE } from "@/lib/company";
import {
  classifyIndustries, industrySlugFor, normalizeIndustry, normalizeIndustryCode, normalizeIndustryName,
  parseIndustryList, parseLegacyMainIndustry,
} from "./normalize";
import { planCompanyIndustries } from "./persist";

test("normalizeIndustryCode: strings keep leading zeros, numbers are padded to 4, junk is rejected", () => {
  assert.equal(normalizeIndustryCode("0210"), "0210");
  assert.equal(normalizeIndustryCode(" 6201 "), "6201");
  assert.equal(normalizeIndustryCode("6201.0"), "6201");
  assert.equal(normalizeIndustryCode(210), "0210");
  assert.equal(normalizeIndustryCode(6201), "6201");
  assert.equal(normalizeIndustryCode("01110"), "01110");
  assert.equal(normalizeIndustryCode("6"), null);
  assert.equal(normalizeIndustryCode("620100"), null);
  assert.equal(normalizeIndustryCode("62a1"), null);
  assert.equal(normalizeIndustryCode(null), null);
  assert.equal(normalizeIndustryCode(-5), null);
});

test("normalizeIndustryName: whitespace, unicode, trailing punctuation and source detail suffixes", () => {
  assert.equal(normalizeIndustryName("  Lập   trình  máy vi tính  "), "Lập trình máy vi tính");
  assert.equal(normalizeIndustryName("Bán buôn kim loại-"), "Bán buôn kim loại");
  assert.equal(normalizeIndustryName("Sản xuất gỗ dán-(không hoạt động tại trụ sở)"), "Sản xuất gỗ dán");
  assert.equal(normalizeIndustryName("Sản xuất khác-Chi tiết: A; B"), "Sản xuất khác");
  assert.equal(normalizeIndustryName("Lập trình".normalize("NFD")), "Lập trình".normalize("NFC"));
  assert.equal(normalizeIndustryName("  -- "), null);
  assert.equal(normalizeIndustry("6201", ""), null);
  assert.deepEqual(normalizeIndustry("6201", "Lập trình"), { code: "6201", name: "Lập trình" });
});

test("parseIndustryList: semicolon and comma separated, names containing separators, duplicates", () => {
  const semi = parseIndustryList("1621: Gỗ dán-(không hoạt động);1629: Sản xuất sản phẩm khác từ gỗ; sản xuất từ tre, nứa-Chi tiết: x;5510: Lưu trú");
  assert.deepEqual(semi.map((e) => e.code), ["1621", "1629", "5510"]);
  assert.equal(semi[1].name, "Sản xuất sản phẩm khác từ gỗ; sản xuất từ tre, nứa");
  const comma = parseIndustryList("4661:Bán buôn nhiên liệu rắn, lỏng, khí,4669:Bán buôn chuyên doanh khác,4933:Vận tải");
  assert.deepEqual(comma.map((e) => e.code), ["4661", "4669", "4933"]);
  assert.equal(comma[0].name, "Bán buôn nhiên liệu rắn, lỏng, khí");
  assert.deepEqual(parseIndustryList("4661:A;4661:A again").map((e) => e.code), ["4661"]);
  assert.deepEqual(parseIndustryList("không có mã"), []);
  assert.deepEqual(parseIndustryList(null), []);
});

test("legacy mainIndustry parsing and slug: code is identity, name only presentation", () => {
  assert.deepEqual(parseLegacyMainIndustry("6201 - Lập trình máy vi tính"), { code: "6201", name: "Lập trình máy vi tính" });
  assert.equal(parseLegacyMainIndustry("Lập trình"), null);
  assert.equal(industrySlugFor({ code: "6201", name: "Lập trình máy vi tính" }), "6201-lap-trinh-may-vi-tinh");
  const renamed = industrySlugFor({ code: "6201", name: "Hoạt động lập trình" });
  assert.ok(renamed.startsWith("6201-"));
});

test("classifyIndustries: at most one primary, no duplicates, primary never repeated as secondary", () => {
  const a = { code: "6201", name: "A" };
  const b = { code: "6202", name: "B" };
  const r = classifyIndustries(a, [a, b, b, { code: "6201", name: "A again" }]);
  assert.deepEqual(r.primary, a);
  assert.deepEqual(r.others, [b]);
  assert.deepEqual(classifyIndustries(null, [b, b]).others, [b]);
});

test("plan: empty company gets the primary, cache is filled when missing", () => {
  const p = planCompanyIndustries({ taxCode: "x", primary: { code: "6201", name: "A" }, others: [{ code: "6202", name: "B" }] }, { mainIndustry: null }, []);
  assert.deepEqual(p.inserts, [{ code: "6201", name: "A", isPrimary: true }, { code: "6202", name: "B", isPrimary: false }]);
  assert.equal(p.cacheToFill, "6201 - A");
  assert.equal(p.conflict, false);
});

test("plan: legacy mainIndustry equal to the incoming primary is materialized as primary (backfill case B)", () => {
  const p = planCompanyIndustries({ taxCode: "x", primary: { code: "6201", name: "A" }, others: [] }, { mainIndustry: "6201 - A" }, []);
  assert.deepEqual(p.inserts, [{ code: "6201", name: "A", isPrimary: true }]);
  assert.equal(p.cacheToFill, null);
});

test("plan: a different incoming primary never replaces the existing one (conflict, stored as plain industry)", () => {
  const p = planCompanyIndustries(
    { taxCode: "x", primary: { code: "9999", name: "Z" }, others: [{ code: "6201", name: "A" }] },
    { mainIndustry: "6201 - A" },
    [{ code: "6201", isPrimary: true }],
  );
  assert.equal(p.conflict, true);
  assert.deepEqual(p.inserts, [{ code: "9999", name: "Z", isPrimary: false }]);
});

test("plan: rerun with the same data plans nothing", () => {
  const input = { taxCode: "x", primary: { code: "6201", name: "A" }, others: [{ code: "6202", name: "B" }] };
  const p = planCompanyIndustries(input, { mainIndustry: "6201 - A" }, [{ code: "6201", isPrimary: true }, { code: "6202", isPrimary: false }]);
  assert.deepEqual(p.inserts, []);
});

const fetched = (over: Partial<CompanyData>): CompanyData => ({
  taxCode: "0100109106", name: "CTY A", nameForeign: null, nameShort: null, address: null, province: null, district: null, ward: null,
  status: null, activeDate: null, legalType: null, taxOffice: null, representativeName: null, mainIndustryCode: null, mainIndustry: null, capital: null,
  ...over,
});

test("partial update: missing fields are omitted, never written as null (taxOffice survives a thinner sync)", () => {
  const u = buildEnrichUpdate(fetched({ name: "CTY A", address: "HN" }), new Date("2026-01-01"));
  assert.ok(!("taxOffice" in u) && !("mainIndustry" in u) && !("status" in u) && !("capital" in u));
  assert.equal(u.name, "CTY A");
  assert.equal(u.enrichStatus, "OK");
  assert.ok(!("dataUpdatedAt" in u));
  assert.equal(Object.values(u).includes(null as never), false);
  assert.equal(Object.values(u).includes(undefined as never), false);
});

test("partial update: a present field is written, including taxOffice when the source has it", () => {
  const u = buildEnrichUpdate(fetched({ taxOffice: "Chi cục Thuế A", capital: "1000" }), new Date());
  assert.equal(u.taxOffice, "Chi cục Thuế A");
  assert.equal(String(u.capital), "1000");
});

test("MST: 10-digit, 13-digit, leading zeros stay strings, no collision between base and branch", () => {
  const base = validateMst("0100109106");
  assert.ok(base.valid && base.normalized === "0100109106");
  const branch = validateMst("0100109106-001");
  assert.ok(branch.valid && branch.normalized === "0100109106-001" && branch.branch === "001");
  const compact = validateMst("0100109106001");
  assert.ok(compact.valid && compact.normalized === "0100109106-001");
  assert.notEqual(base.valid && base.normalized, compact.valid && compact.normalized);
  assert.equal(validateMst("0100109107").valid, false);
  assert.equal(validateMst("0100109106-000").valid, false);
  assert.equal(validateMst("100109106").valid, false);
  assert.equal(typeof (base.valid && base.normalized), "string");
  assert.ok(TAX_CODE_RE.test("0100109106") && TAX_CODE_RE.test("0100109106-001") && !TAX_CODE_RE.test("0100109106-01"));
});

test("sitemap lastmod uses meaningful data timestamps, never Prisma updatedAt, and is omitted when unknown", () => {
  const d = (s: string) => new Date(s);
  assert.equal(companyLastmod({ dataUpdatedAt: d("2026-03-01"), dataAsOf: d("2025-11-14"), lastEnrichedAt: d("2026-01-01") }), d("2026-03-01").toISOString());
  assert.equal(companyLastmod({ dataUpdatedAt: null, dataAsOf: d("2025-11-14"), lastEnrichedAt: d("2026-01-01") }), d("2025-11-14").toISOString());
  assert.equal(companyLastmod({ dataUpdatedAt: null, dataAsOf: null, lastEnrichedAt: d("2026-01-01") }), d("2026-01-01").toISOString());
  assert.equal(companyLastmod({ dataUpdatedAt: null, dataAsOf: null, lastEnrichedAt: null }), undefined);
});
