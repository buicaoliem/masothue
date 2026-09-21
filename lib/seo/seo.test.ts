import assert from "node:assert/strict";
import { test } from "node:test";
import { GUIDES } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";
import robots from "@/app/robots";
import { SEO_CONFIG } from "./config";
import { isCompanyProfileIndexable, isTaxonomyPageIndexable, minCompaniesFor } from "./indexability";
import { articleJsonLd, breadcrumbJsonLd, organizationJsonLd, serializeJsonLd, websiteJsonLd, withHome } from "./jsonld";
import {
  buildCompanyMetadata,
  buildGuideMetadata,
  buildIndustryMetadata,
  buildNoindexMetadata,
  buildProvinceMetadata,
  buildTaxonomyMetadata,
  truncateDescription,
} from "./metadata";
import { slugify } from "./slug";
import { classifyStatus, legalFormSlug, STATUS_PAGES } from "./taxonomy";
import { industryPath, parseIndustrySlug, parsePage, provinceIndustryPath } from "./urls";

const company = { name: "CÔNG TY CỔ PHẦN FPT", address: "Hà Nội", taxCode: "0101248141", isHidden: false, enrichStatus: "OK" as const };

test("legal form slugs use the searched abbreviation", () => {
  assert.equal(legalFormSlug("Công ty trách nhiệm hữu hạn một thành viên"), "cong-ty-tnhh-mot-thanh-vien");
  assert.equal(legalFormSlug("Công ty cổ phần"), "cong-ty-co-phan");
});

test("slugify strips Vietnamese diacritics", () => {
  assert.equal(slugify("Lập trình máy vi tính"), "lap-trinh-may-vi-tinh");
  assert.equal(slugify("Công ty TNHH Một thành viên"), "cong-ty-tnhh-mot-thanh-vien");
  assert.equal(slugify("Đà Nẵng"), "da-nang");
});

test("company profile: canonical is /{mst} regardless of name; title and description follow the template", () => {
  const m = buildCompanyMetadata({ taxCode: company.taxCode, name: company.name }, true);
  assert.equal(m.alternates?.canonical, `${SITE_URL}/0101248141`);
  assert.equal(m.title, "0101248141 - CÔNG TY CỔ PHẦN FPT | Mã số thuế");
  assert.ok(String(m.description).startsWith("Tra cứu mã số thuế 0101248141 - CÔNG TY CỔ PHẦN FPT:"));
  assert.ok(String(m.description).length <= 160);
  assert.deepEqual(m.robots, { index: true, follow: true });
});

test("company profile indexability mirrors the sitemap 'listable' rule", () => {
  assert.equal(isCompanyProfileIndexable(company), true);
  assert.equal(isCompanyProfileIndexable({ ...company, isHidden: true }), false);
  assert.equal(isCompanyProfileIndexable({ ...company, enrichStatus: "PENDING" }), false);
  assert.equal(isCompanyProfileIndexable({ ...company, enrichStatus: "SOURCE_MISS" }), false);
  assert.equal(isCompanyProfileIndexable({ ...company, name: " " }), false);
  assert.equal(isCompanyProfileIndexable({ ...company, address: null }), false);
  assert.equal(isCompanyProfileIndexable({ ...company, taxCode: "abc" }), false);
  assert.equal(isCompanyProfileIndexable({ ...company, taxCode: "0100111948-001" }), true);
});

test("taxonomy indexability: zero-result and thin pages are noindex, page 2+ is noindex", () => {
  const kinds = ["province", "industry", "legal-form", "status", "province-industry", "new-companies"] as const;
  for (const kind of kinds) {
    const min = minCompaniesFor(kind);
    assert.equal(isTaxonomyPageIndexable({ kind, total: 0 }), false, `${kind} zero`);
    assert.equal(isTaxonomyPageIndexable({ kind, total: min - 1 }), false, `${kind} below min`);
    assert.equal(isTaxonomyPageIndexable({ kind, total: min }), true, `${kind} at min`);
    assert.equal(isTaxonomyPageIndexable({ kind, total: min * 100, page: 2 }), false, `${kind} page 2`);
  }
  assert.ok(SEO_CONFIG.provinceIndustryMinCompanies > SEO_CONFIG.taxonomyMinCompanies);
});

test("paginated taxonomy pages self-canonicalize with ?trang and are noindex,follow", () => {
  const index = isTaxonomyPageIndexable({ kind: "legal-form", total: 500, page: 2 });
  const m = buildTaxonomyMetadata({ title: "T", description: "d", path: "/loai-hinh/x", page: 2, index });
  assert.equal(m.alternates?.canonical, `${SITE_URL}/loai-hinh/x?trang=2`);
  assert.deepEqual(m.robots, { index: false, follow: true });
  const p1 = buildTaxonomyMetadata({ title: "T", description: "d", path: "/loai-hinh/x", page: 1, index: true });
  assert.equal(p1.alternates?.canonical, `${SITE_URL}/loai-hinh/x`);
});

test("province and industry metadata", () => {
  const p = buildProvinceMetadata({ slug: "ha-noi", displayName: "TP. Hà Nội" }, 1, true);
  assert.equal(p.alternates?.canonical, `${SITE_URL}/tinh/ha-noi`);
  const path = industryPath("6201", "Lập trình máy vi tính");
  assert.equal(path, "/nganh/6201-lap-trinh-may-vi-tinh");
  const i = buildIndustryMetadata({ path, code: "6201", name: "Lập trình máy vi tính" }, 1, true);
  assert.equal(i.alternates?.canonical, `${SITE_URL}/nganh/6201-lap-trinh-may-vi-tinh`);
  assert.equal(provinceIndustryPath("ha-noi", "6201", "Lập trình máy vi tính"), "/tinh/ha-noi/nganh/6201-lap-trinh-may-vi-tinh");
});

test("noindex utility metadata has no canonical", () => {
  const m = buildNoindexMetadata("Kết quả tìm kiếm");
  assert.deepEqual(m.robots, { index: false, follow: true });
  assert.equal(m.alternates, undefined);
});

test("metadata never carries a keywords tag and descriptions stay short", () => {
  const m = buildGuideMetadata(GUIDES[0]);
  assert.equal((m as Record<string, unknown>).keywords, undefined);
  assert.ok(truncateDescription("a ".repeat(200)).length <= 160);
});

test("parseIndustrySlug / parsePage", () => {
  assert.deepEqual(parseIndustrySlug("6201-lap-trinh"), { code: "6201", slug: "lap-trinh" });
  assert.deepEqual(parseIndustrySlug("6201"), { code: "6201", slug: "" });
  assert.equal(parseIndustrySlug("abc"), null);
  assert.equal(parsePage(undefined), 1);
  assert.equal(parsePage("3"), 3);
  assert.equal(parsePage("0"), null);
  assert.equal(parsePage("2x"), null);
});

test("status classification agrees with the status pages", () => {
  assert.equal(classifyStatus("NNT đang hoạt động")?.slug, "dang-hoat-dong");
  assert.equal(classifyStatus("Đang hoạt động")?.slug, "dang-hoat-dong");
  assert.equal(classifyStatus("Tạm ngừng kinh doanh")?.slug, "tam-ngung");
  assert.equal(classifyStatus("NNT ngừng hoạt động nhưng chưa hoàn thành thủ tục")?.slug, "ngung-hoat-dong");
  assert.equal(classifyStatus("Giải thể")?.slug, "ngung-hoat-dong");
  assert.equal(classifyStatus("Đã giải thể, phá sản, chấm dứt tồn tại")?.slug, "ngung-hoat-dong");
  assert.equal(classifyStatus("Bị thu hồi giấy chứng nhận đăng ký doanh nghiệp do cưỡng chế về quản lý thuế")?.slug, "ngung-hoat-dong");
  assert.equal(classifyStatus("Không còn hoạt động kinh doanh tại địa chỉ đã đăng ký")?.slug, "ngung-hoat-dong");
  assert.equal(classifyStatus("Không rõ"), undefined);
  assert.equal(new Set(STATUS_PAGES.map((s) => s.slug)).size, STATUS_PAGES.length);
});

test("JSON-LD: breadcrumb uses canonical absolute URLs and serializes safely", () => {
  const ld = breadcrumbJsonLd(withHome([{ name: "Hà Nội", path: "/tinh/ha-noi" }]));
  assert.equal(ld.itemListElement[0].item, `${SITE_URL}/`);
  assert.equal(ld.itemListElement[1].position, 2);
  const raw = serializeJsonLd({ name: "</script><b>" });
  assert.ok(!raw.includes("</script>"));
  assert.doesNotThrow(() => JSON.parse(raw));
});

test("JSON-LD: website/organization/article parse and contain no null/undefined", () => {
  for (const ld of [websiteJsonLd(), organizationJsonLd(), articleJsonLd({ ...GUIDES[0] })]) {
    const s = serializeJsonLd(ld);
    assert.ok(!s.includes("null") && !s.includes("undefined"));
    assert.equal(JSON.parse(s)["@context"], "https://schema.org");
  }
  assert.equal(websiteJsonLd().url, `${SITE_URL}/`);
});

test("guides: unique slugs, ISO dates, modified >= published, internal links only", () => {
  assert.equal(new Set(GUIDES.map((g) => g.slug)).size, GUIDES.length);
  for (const g of GUIDES) {
    assert.match(g.published, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(g.modified >= g.published);
    assert.ok(g.description.length <= 200 && g.title.length > 0);
    for (const r of g.related) assert.ok(r.href.startsWith("/"), r.href);
  }
});

test("robots.txt declares the sitemap index and does not block search or assets", () => {
  const r = robots();
  assert.equal(r.sitemap, `${SITE_URL}/sitemap.xml`);
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
  const disallow = rules.flatMap((x) => (Array.isArray(x.disallow) ? x.disallow : x.disallow ? [x.disallow] : []));
  assert.ok(!disallow.some((d) => /tim-kiem|search|_next/.test(d)), "noindex routes must stay crawlable");
});
