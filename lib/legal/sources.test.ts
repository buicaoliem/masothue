import assert from "node:assert/strict";
import { test } from "node:test";
import { auditRepo, auditText } from "../../scripts/legal-audit";
import { GUIDES } from "../guides";
import { describeLegalSource, LEGAL_SOURCES, legalCitation, type LegalSource } from "./sources";

const all = Object.values(LEGAL_SOURCES) as LegalSource[];

test("legal registry: replaces/replacedBy/amendedBy are consistent and expired documents carry an expiry date", () => {
  for (const s of all) {
    if (s.status === "expired") assert.ok(s.expiredAt && s.replacedBy?.length, s.key);
    for (const k of [...(s.replaces ?? []), ...(s.replacedBy ?? []), ...(s.amendedBy ?? [])]) assert.ok(k in LEGAL_SOURCES, `${s.key} -> ${k}`);
    for (const k of s.replaces ?? []) assert.ok((LEGAL_SOURCES as Record<string, LegalSource>)[k].replacedBy?.includes(s.key as never), `${k} should point back to ${s.key}`);
    assert.match(s.officialUrl, /^https:\/\/(dangkykinhdoanh\.gov\.vn|vbpl\.vn|vanban\.chinhphu\.vn|congbao\.chinhphu\.vn)\//);
  }
});

test("legal registry: the verified 2025 facts", () => {
  assert.equal(LEGAL_SOURCES.businessRegistration2021.expiredAt, "2025-07-01");
  assert.equal(LEGAL_SOURCES.businessRegistration2025.effectiveAt, "2025-07-01");
  assert.equal(LEGAL_SOURCES.vsic2018.expiredAt, "2025-11-15");
  assert.equal(LEGAL_SOURCES.vsic2025.effectiveAt, "2025-11-15");
  assert.equal(LEGAL_SOURCES.vsic2025.issuedAt, "2025-09-29");
  assert.deepEqual(LEGAL_SOURCES.enterpriseLaw2020.amendedBy, ["enterpriseLawAmendment2025"]);
  assert.match(legalCitation("businessRegistration2021"), /đã hết hiệu lực từ 01\/07\/2025/);
  assert.match(describeLegalSource("vsic2018").statusLabel, /Đã hết hiệu lực từ 15\/11\/2025, thay bằng 36\/2025\/QĐ-TTg/);
});

test("guides: an expired legal source is only cited with a note explaining why", () => {
  for (const g of GUIDES) for (const s of g.sources ?? []) if (s.legal && LEGAL_SOURCES[s.legal].status === "expired") assert.ok(s.note && /(không còn|so sánh|chỉ nêu)/.test(s.note), `${g.slug}: ${s.legal}`);
});

test("guides: Luật Doanh nghiệp 2020 is always cited together with its 2025 amendment", () => {
  for (const g of GUIDES) {
    const keys = (g.sources ?? []).map((s) => s.legal);
    if (keys.includes("enterpriseLaw2020")) assert.ok(keys.includes("enterpriseLawAmendment2025"), g.slug);
  }
});

test("legal-audit: flags unmarked stale citations, accepts historical ones, and the repo is clean", () => {
  assert.equal(auditText("x.md", "Theo Nghị định 01/2021/NĐ-CP, doanh nghiệp đăng ký...").length, 1);
  assert.equal(auditText("x.md", "Nghị định 01/2021/NĐ-CP (đã hết hiệu lực)").length, 0);
  assert.equal(auditText("x.md", "Hệ thống ngành hiện hành theo Quyết định 27/2018/QĐ-TTg").length, 1);
  assert.equal(auditText("x.md", "Luật Doanh nghiệp 59/2020/QH14 quy định").length, 1);
  assert.equal(auditText("x.md", "Luật Doanh nghiệp 59/2020/QH14 và Luật 76/2025/QH15").length, 0);
  assert.deepEqual(auditRepo(), []);
});

import { LEGAL_SOURCES as SRC } from "./sources";
test("tax registration circulars: 105/2020 and 86/2024 expired, 90/2026 current", () => {
  assert.equal(SRC.taxRegistration2020.status, "expired");
  assert.equal(SRC.taxRegistration2020.expiredAt, "2025-02-06");
  assert.equal(SRC.taxRegistration2024.status, "expired");
  assert.equal(SRC.taxRegistration2026.status, "in-force");
});

test("legal-audit flags 105/2020 and 86/2024 presented as current, accepts historical mentions", () => {
  assert.equal(auditText("x.md", "Tính theo Thông tư 105/2020/TT-BTC.").length, 1);
  assert.equal(auditText("x.md", "Áp dụng Thông tư 86/2024/TT-BTC hiện hành.").length, 1);
  assert.equal(auditText("x.md", "Thông tư 105/2020/TT-BTC (đã hết hiệu lực từ 06/02/2025)").length, 0);
});
