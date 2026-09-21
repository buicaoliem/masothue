# VSIC 2018 vs VSIC 2025: audit, impact and migration proposal (2026-09-21)

Status: **report only. No database migration was run and none is proposed for immediate execution.**

## 1. Legal facts (checked against official text)

| Document | Status |
|---|---|
| Nghị định 01/2021/NĐ-CP (đăng ký doanh nghiệp) | Hết hiệu lực 01/07/2025 |
| Nghị định 168/2025/NĐ-CP (ban hành 30/06/2025) | Hiệu lực 01/07/2025, thay 01/2021 |
| Luật Doanh nghiệp 59/2020/QH14 | Còn hiệu lực, sửa đổi bởi Luật 76/2025/QH15 (hiệu lực 01/07/2025) |
| Quyết định 27/2018/QĐ-TTg (VSIC 2018) | Hết hiệu lực 15/11/2025 |
| Quyết định 36/2025/QĐ-TTg (ban hành 29/09/2025) | Hiệu lực 15/11/2025, thay 27/2018 |

Central registry: `lib/legal/sources.ts`. Nghị định 168/2025/NĐ-CP Điều 8 (read from the full text): khoản 1 mã số doanh
nghiệp đồng thời là mã số thuế; khoản 5 mã số đơn vị phụ thuộc (chi nhánh, văn phòng đại diện) đồng thời là mã số thuế;
khoản 6 **mã số địa điểm kinh doanh gồm 5 chữ số và không phải mã số thuế**. The published guides previously said địa điểm
kinh doanh has a 13-digit MST; that claim was removed.

## 2. Structure of the 2025 system (Phụ lục I, parsed from the official .docx: `data/vsic/vsic2025.json`)

| Level | 2018 (official) | 2025 (parsed, matches the document's own totals row) |
|---|---|---|
| 1 | 21 (A-U) | 22 (A-V): J of 2018 is split into J and K |
| 2 | 88 | 87 (division 45 removed; its content moves into 466, 478, 953) |
| 3 | 242 | 259 |
| 4 | 486 | 495 |
| 5 | 734 | 743 |

Source of the 2025 list: `https://dangkykinhdoanh.gov.vn/Images/FileVanBan/_12.9_PL1kinhtevietnam.docx` (Phụ lục I) and
`..._PL2kinhtevietnam.docx` (Phụ lục II, content notes; read, not machine-diffed).

## 3. Limits of the 2018 side (be honest)

The only official 2018 file reachable is a **scanned PDF** (Công báo / chinhphu.vn). OCR recovers all 88 level-2 and 242
level-3 codes (equal to the official counts) but only 467 of 486 level-4 and 738 (noisy) of 734 level-5 codes; names are
unusable. Therefore:

- A code absent from `data/vsic/vsic2018-ocr-codes.json` is **not** proof it did not exist in 2018 (e.g. 0130, 0230 were
  missed by OCR, and their 2018 names are confirmed by the source data).
- Names for 2018 come from **the spelling observed in source data**, not from an official 2018 file.
- The official 2018 -> 2025 conversion table was not found. Splits and merges cannot be identified and are not claimed.

`data/vsic/vsic-code-diff.json` (`npm run data:vsic-diff`): per code `changeType` in `unchanged | renamed |
present-in-both | removed-or-restructured | new-or-restructured`. Level 5: 579 codes in both lists, 159 only in 2018 (OCR),
164 only in 2025.

## 4. Impact on the 585 `IndustryCatalog` codes (`npm run data:vsic-classify`, read-only)

| Bucket | Codes |
|---|---|
| total | 585 |
| same name in 2025 (scope not proven equal) | 323 |
| **same code, different name in 2025** (rename or semantic change, needs review) | 150 |
| present in 2018, **absent in 2025** (removed, split or merged) | 81 |
| unknown (not in the OCR list, not in 2025) | 31 |

Examples that make number-similarity mapping unsafe:

- `01183`: 2018 "Trồng hoa, cây cảnh" vs 2025 "Trồng hoa hàng năm".
- `02101`: 2018 "Ươm giống cây lâm nghiệp" vs 2025 "Trồng rừng và chăm sóc rừng cây thân gỗ" (different activity under the same code).
- `1104`: 2018 "Sản xuất đồ uống không cồn, nước khoáng" vs 2025 "Sản xuất mạch nha ủ men bia".
- `4669` (2018 "Bán buôn chuyên doanh khác chưa được phân vào đâu", the most common catch-all in HCM data), `6201` (Lập trình máy vi tính), `4511` (bán buôn ô tô) do not exist in 2025.

## 5. Which classification do the sources use?

No source ships metadata, a data dictionary or a classification field. Measured from content:

| Source | Dataset date | Distinct codes | Codes only in 2018 list | Memberships on those codes | Codes only in 2025 list |
|---|---|---|---|---|---|
| opendata-hcm | 2025-11-14 | 526 | 69 | 497,683 of 3,804,692 | 2 (0130, 0230: OCR gaps, both are 2018 codes) |
| opendata-sonla | 2024-11-25 | 256 | 36 | 264 of 3,823 | 1 (0130, same) |
| opendata-quangngai | 2025-03-27 | 492 | 66 | 2,990 of 40,121 | 2 (same) |

Conclusion: all three sources use **VSIC 2018 codes** (they contain codes that exist only in 2018 and no code that exists
only in 2025). This is an evidence-based finding, not a declared one; the site states it as "theo nguồn công bố" and
`STORED_CODES_VERSION` (`lib/industry/classification.ts`) records it. HCM dated 14/11/2025 is one day before 36/2025 took effect.

## 6. Proposal (not executed)

1. **Do not rewrite memberships.** Keep `CompanyIndustry` / `CompanyIndustrySet` codes as published.
2. Schema, when a second version is first needed (additive, no backfill of 3.8M rows):
   - `IndustryCatalog`: add `classificationVersion` (`VSIC_2018 | VSIC_2025 | UNKNOWN`) and make the key `(classificationVersion, code)`; today's 585 rows become `VSIC_2018`, which is exactly their provenance.
   - `CompanyIndustry` / `CompanyIndustrySet`: add nullable `sourceClassificationVersion`, default derived per source (`opendata-*` -> `VSIC_2018`), so a lookup joins on (version, code) and can never render a 2018 code with a 2025 name.
   - Load the 743 codes of VSIC 2025 as `VSIC_2025` rows only for display of the current system and for future sources that publish 2025 codes.
3. **Mapping** only where an official conversion table (or a proven 1:1 identical code+scope) exists. Everything split, merged or with changed scope stays un-mapped. Obtain the official 2018 -> 2025 table from the Cục Thống kê / Bộ Tài chính before any conversion.
4. **Stable URLs.** `/nganh/{code}-{slug}` stays as is: the page describes the code as published by the sources (2018), which is still what the data means. No bulk redirect. When 2025-native codes appear:
   - same code, equivalent scope: keep the URL, update the display name, redirect the old slug to the canonical slug (as the route already does for slug mismatch);
   - changed scope: keep the 2018 page for 2018-sourced data and create a separate 2025 page; never redirect one meaning to another.
5. **Data impact:** none now. 202,509 companies with industry data and 3.8M memberships are untouched. `IndustryStat` and sitemap URLs unchanged.

## 7. Site changes in this phase

- Legal citations centralised (`lib/legal/sources.ts`), guides reference keys, UI shows issuer, dates, status ("Đã hết hiệu lực" for expired) and the verification date.
- Guide `ma-nganh-kinh-te-la-gi` rewritten for Quyết định 36/2025/QĐ-TTg (22/87/259/495/743) with a section on which system the stored data uses.
- Version label on `/nganh`, `/nganh/{code}-{slug}`, company pages and `/nguon-du-lieu`.
- `npm run content:legal-audit` and unit tests guard against unmarked `01/2021/NĐ-CP`, `27/2018/QĐ-TTg`, `A-U`/`21 ngành`, and `59/2020/QH14` without `76/2025/QH15`.
