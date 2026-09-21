import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEGAL_SOURCES } from "../legal/sources";
import { GUIDES } from "../guides";
import { industryPath } from "../seo/urls";
import { SITEMAP_SECTIONS } from "../sitemap";
import { TAX_STATUSES, TAX_STATUS_DETAIL_PAGES, findTaxStatus, taxStatusPath } from "../tax-status/catalog";
import { STATUS_PAGES } from "../seo/taxonomy";
import { ENABLED_TOOLS } from "../tools/registry";
import { getVsic2025, VSIC_2025_ROOT, vsic2025Path } from "./catalog";
import { listIndexableVsic2025 } from "./content";
import { officialTargetsFor2018 } from "./convert";

describe("VSIC 2025 routes are separate from company taxonomy", () => {
  it("/nganh path shape is unchanged and /ma-nganh-2025 never collides with it", () => {
    assert.equal(industryPath("6201", "Lập trình máy vi tính"), "/nganh/6201-lap-trinh-may-vi-tinh");
    const e = getVsic2025("62190")!;
    assert.ok(vsic2025Path(e).startsWith(`${VSIC_2025_ROOT}/`));
    assert.ok(!vsic2025Path(e).startsWith("/nganh"));
  });
  it("existing sitemap sections are kept and vsic-2025 is added", () => {
    for (const s of ["static", "tools", "guides", "provinces", "industries", "taxonomy", "directory"]) assert.ok((SITEMAP_SECTIONS as readonly string[]).includes(s), s);
    assert.ok((SITEMAP_SECTIONS as readonly string[]).includes("vsic-2025"));
  });
  it("every sitemap URL of the section is canonical-shaped, unique and query free", () => {
    const paths = listIndexableVsic2025().map(vsic2025Path);
    assert.equal(new Set(paths).size, paths.length);
    assert.ok(paths.every((p) => /^\/ma-nganh-2025\/[a-z0-9-]+$/.test(p)));
    assert.ok(paths.length < 50_000);
  });
  it("converter is a registered, enabled tool", () => {
    assert.ok(ENABLED_TOOLS.some((t) => t.slug === "chuyen-doi-ma-nganh-2018-2025"));
  });
  it("official 2025 mapping is available for /nganh pages and shows every target of a split code", () => {
    assert.deepEqual(officialTargetsFor2018("6201").map((m) => m.toCode), ["6211", "6219"]);
    assert.deepEqual(officialTargetsFor2018("4669").map((m) => m.toCode), ["4679"]);
  });
  it("the three existing guides link to the new tools", () => {
    for (const slug of ["ma-nganh-kinh-te-la-gi", "cach-tra-cuu-ma-nganh-cua-doanh-nghiep", "nganh-nghe-chinh-va-nganh-nghe-dang-ky"]) {
      const hrefs = GUIDES.find((g) => g.slug === slug)!.related.map((r) => r.href);
      assert.ok(hrefs.includes("/ma-nganh-2025") && hrefs.includes("/cong-cu/chuyen-doi-ma-nganh-2018-2025"), slug);
    }
  });
});

describe("tax status reference (Thông tư 90/2026/TT-BTC, Phụ lục I)", () => {
  it("lists exactly the official codes; 08 is absent; 04 is void", () => {
    assert.deepEqual(TAX_STATUSES.map((s) => s.code), ["00", "01", "02", "03", "04", "05", "06", "07", "09", "10"]);
    assert.equal(findTaxStatus("08"), undefined);
    assert.equal(findTaxStatus("04")!.effectiveStatus, "void");
    assert.equal(findTaxStatus("04")!.reasons.length, 0);
  });
  it("detail pages: the six requested intents, unique slugs, none for void codes", () => {
    assert.deepEqual(TAX_STATUS_DETAIL_PAGES.map((s) => s.code), ["00", "03", "05", "06", "07", "09"]);
    const slugs = TAX_STATUS_DETAIL_PAGES.map((s) => s.detailSlug);
    assert.equal(new Set(slugs).size, slugs.length);
    assert.ok(TAX_STATUS_DETAIL_PAGES.every((s) => s.whatToCheck?.length && s.reasons.length));
    assert.equal(taxStatusPath("05-nnt-tam-ngung-hoat-dong-kinh-doanh"), "/trang-thai/mst/05-nnt-tam-ngung-hoat-dong-kinh-doanh");
  });
  it("reason codes are unique within a status and the legal source is current", () => {
    for (const s of TAX_STATUSES) {
      const codes = s.reasons.map((r) => r.code);
      assert.equal(new Set(codes).size, codes.length, s.code);
      assert.equal(LEGAL_SOURCES[s.legalSource].status, "in-force");
    }
    assert.equal(LEGAL_SOURCES.taxRegistration2026.number, "90/2026/TT-BTC");
    assert.equal(LEGAL_SOURCES.taxRegistration2026.effectiveAt, "2026-07-01");
  });
  it("company status hubs keep their slugs (no regression) and are not remapped to the new codes", () => {
    assert.deepEqual(STATUS_PAGES.map((s) => s.slug), ["dang-hoat-dong", "tam-ngung", "ngung-hoat-dong"]);
  });
});
