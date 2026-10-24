import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAreaIndex, sameAreaCompanies, sameIndustryCompanies, topIndustries, type AreaCompany } from "@/lib/area-index";
import { parseAddressArea } from "./area";

test("district and ward come from the address positions before the province", () => {
  const a = parseAddressArea("Thôn An Phong, Xã Bình Mỹ, Huyện Bình Sơn, Tỉnh Quảng Ngãi, Việt Nam");
  assert.deepEqual(a.district, { name: "Huyện Bình Sơn", slug: "huyen-binh-son" });
  assert.deepEqual(a.ward, { name: "Xã Bình Mỹ", slug: "xa-binh-my" });
  assert.equal(a.formerProvince, null);
});

test("a city-level district with the province's name is still a district", () => {
  const a = parseAddressArea("168 Hùng Vương, Phường Trần Phú, Thành phố Quảng Ngãi, Tỉnh Quảng Ngãi, Việt Nam");
  assert.equal(a.district?.slug, "thanh-pho-quang-ngai");
  assert.equal(a.ward?.slug, "phuong-tran-phu");
});

test("prefix casing and zero-padded ward numbers are normalised", () => {
  const a = parseAddressArea("Tổ dân phố 1, Thị Trấn La Hà, Huyện Tư Nghĩa, Tỉnh Quảng Ngãi, Việt Nam");
  assert.deepEqual(a.ward, { name: "Thị trấn La Hà", slug: "thi-tran-la-ha" });
  const b = parseAddressArea("101 Nguyễn Tri Phương, Phường 07, Quận 5, Thành phố Hồ Chí Minh, Việt Nam");
  assert.deepEqual(b.ward, { name: "Phường 7", slug: "phuong-7" });
  assert.deepEqual(b.district, { name: "Quận 5", slug: "quan-5" });
  assert.equal(b.formerProvince, null);
});

test("post-merger addresses without a district give a ward only", () => {
  const a = parseAddressArea("Số 19 Bà Triệu, Phường Cửa Nam, TP Hà Nội");
  assert.equal(a.district, null);
  assert.equal(a.ward?.slug, "phuong-cua-nam");
});

test("a pre-merger province is reported as former", () => {
  const a = parseAddressArea("Thôn 1, Xã Đăk Hà, Huyện Đăk Hà, Tỉnh Kon Tum, Việt Nam");
  assert.equal(a.formerProvince, "Tỉnh Kon Tum");
  assert.equal(a.district?.slug, "huyen-dak-ha");
});

test("nothing is guessed from unprefixed or unknown segments", () => {
  assert.deepEqual(parseAddressArea("Đường cao tốc Thăng long xã Cổ nhuế, , TP Hà Nội"), { district: null, ward: null, formerProvince: null });
  assert.deepEqual(parseAddressArea("abc, Xã Y, Huyện Z, Atlantis"), { district: null, ward: null, formerProvince: null });
  assert.deepEqual(parseAddressArea(null), { district: null, ward: null, formerProvince: null });
});

const row = (taxCode: string, address: string, industryCode: string | null = null): AreaCompany => ({
  taxCode, name: `CTY ${taxCode}`, address, activeDate: null, status: "Đang hoạt động", industryCode, industryName: industryCode ? `Ngành ${industryCode}` : null,
  ...parseAddressArea(address),
});
const A = "Xã A, Huyện H, Tỉnh Sơn La";
const B = "Xã B, Huyện H, Tỉnh Sơn La";
const index = buildAreaIndex([
  row("5500000001", A, "4100"), row("5500000002", A, "4100"), row("5500000003", A), row("5500000004", B, "4100"),
  row("5500000005", B), row("5500000006", "Phường C, Thành phố Sơn La, Tỉnh Sơn La", "4100"),
]);

test("area index groups by district then ward", () => {
  const h = index.districts.get("huyen-h")!;
  assert.equal(h.companies.length, 5);
  assert.equal(h.wards.get("xa-a")!.companies.length, 3);
  assert.equal(index.districts.size, 2);
});

test("same-area block fills from the ward first, then the district, never the company itself", () => {
  const r = sameAreaCompanies(index, index.byTaxCode.get("5500000001")!, 4);
  assert.equal(r.scope, "ward+district");
  assert.deepEqual(r.companies.map((c) => c.taxCode).slice(0, 2), ["5500000002", "5500000003"]);
  assert.ok(!r.companies.some((c) => c.taxCode === "5500000001"));
  assert.equal(r.companies.length, 4);
});

test("same-industry block prefers the same district and counts the province", () => {
  const r = sameIndustryCompanies(index, index.byTaxCode.get("5500000001")!, "4100", 2);
  assert.equal(r.total, 3);
  assert.deepEqual(r.companies.map((c) => c.taxCode), ["5500000002", "5500000004"]);
});

test("top industries ignore rows without a primary industry", () => {
  assert.deepEqual(topIndustries(index.companies, 3), [{ code: "4100", name: "Ngành 4100", count: 4 }]);
});
