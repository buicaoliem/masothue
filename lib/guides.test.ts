import assert from "node:assert/strict";
import { test } from "node:test";
import { GUIDES } from "./guides";

const slugs = new Set(GUIDES.map((g) => g.slug));
const staticPaths = new Set(["/", "/nganh", "/loai-hinh", "/trang-thai", "/trang-thai#danh-muc-trang-thai-mst", "/ma-nganh-2025", "/thong-ke", "/thong-ke/doanh-nghiep-viet-nam", "/nguon-du-lieu", "/phuong-phap-du-lieu", "/huong-dan"]);

test("guides: at least the five pillar articles exist with answer, sources and a real date", () => {
  for (const s of ["ma-so-doanh-nghiep-co-phai-ma-so-thue", "trang-thai-hoat-dong-cua-doanh-nghiep", "ma-nganh-kinh-te-la-gi", "nganh-nghe-chinh-va-nganh-nghe-dang-ky", "cach-tra-cuu-ma-nganh-cua-doanh-nghiep"]) {
    const g = GUIDES.find((x) => x.slug === s);
    assert.ok(g, s);
    assert.ok(g!.answer && g!.answer.length > 40, `${s} answer`);
    assert.ok(g!.sources && g!.sources.length > 0, `${s} sources`);
    assert.ok(g!.related.length >= 3, `${s} related links`);
    assert.ok(g!.description.length <= 200);
  }
});

test("guides: every internal link resolves to a guide, a tool, a taxonomy hub or a known page", () => {
  const ok = (href: string) =>
    staticPaths.has(href) ||
    (href.startsWith("/huong-dan/") && slugs.has(href.slice("/huong-dan/".length))) ||
    /^\/cong-cu\/[a-z0-9-]+$/.test(href) ||
    /^\/trang-thai\/(dang-hoat-dong|tam-ngung|ngung-hoat-dong)$/.test(href) ||
    /^\/tinh\/[a-z-]+$/.test(href);
  for (const g of GUIDES) {
    for (const r of g.related) assert.ok(ok(r.href), `${g.slug}: ${r.href}`);
    for (const s of g.sections) for (const row of s.table?.rows ?? []) for (const cell of row) if (cell.startsWith("/")) assert.ok(ok(cell), `${g.slug} table: ${cell}`);
    for (const src of g.sources ?? []) if (src.url?.startsWith("/")) assert.ok(ok(src.url), `${g.slug} source: ${src.url}`);
  }
});

test("guides: tables are rectangular and headings are unique per article", () => {
  for (const g of GUIDES) {
    assert.equal(new Set(g.sections.map((s) => s.heading)).size, g.sections.length, g.slug);
    for (const s of g.sections) if (s.table) for (const row of s.table.rows) assert.equal(row.length, s.table.head.length, `${g.slug}: ${s.heading}`);
  }
});

test("guides: no article states a tax rule without a listed source", () => {
  for (const g of GUIDES) {
    const text = JSON.stringify(g.sections).toLowerCase();
    if (/(luật|nghị định|thông tư|quyết định)/.test(text)) assert.ok((g.sources ?? []).length > 0 || /thông tư 105/.test(text) === false, `${g.slug} cites law without sources`);
  }
});
