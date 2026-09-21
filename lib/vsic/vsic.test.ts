import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ConversionParseError, parseConversionRows } from "./conversion-parser";
import { parseCatalogRows, parseContentParagraphs } from "./catalog-parser";
import { allVsic2025, ancestorsOf, childrenOf, getVsic2025, getVsicEntry, isVsic2025PageIndexable, parseVsic2025Slug, searchVsic2025, vsic2025Path } from "./catalog";
import { getVsic2025Content, listIndexableVsic2025 } from "./content";
import { convertCode, searchConversionNames } from "./convert";
import { foldVi } from "./normalize";

const H: string[][] = [["VSIC 2018", "VSIC 2025"], ["Mã", "Tên ngành", "Mã", "Tên ngành"]];
const E5 = ["", "", "", "", ""];
const lvl = (level: number, code: string) => E5.map((_, i) => (i === level - 1 ? code : ""));
const row = (l: string[], ln: string, r: string[], rn: string) => [...l, ln, ...r, rn];

describe("conversion parser", () => {
  it("one-to-one", () => {
    const p = parseConversionRows([...H, row(lvl(5, "01110"), "Trồng lúa", lvl(5, "01110"), "Trồng lúa")], "2018", "2025");
    assert.equal(p.mappings.length, 1);
    assert.equal(p.mappings[0].relationship, "one_to_one");
    assert.equal(p.mappings[0].fromName, "Trồng lúa");
  });
  it("one-to-many via continuation rows, asterisk kept as a flag", () => {
    const p = parseConversionRows(
      [...H, row(lvl(5, "62010"), "Lập trình", lvl(5, "62110*"), "Trò chơi"), row(E5, "", lvl(5, "62190*"), "Lập trình khác")],
      "2018",
      "2025",
    );
    assert.deepEqual(p.mappings.map((m) => [m.toCode, m.relationship, m.flagged]), [["62110", "one_to_many", true], ["62190", "one_to_many", true]]);
    assert.ok(p.mappings[0].officialNote);
  });
  it("many-to-one and many-to-many are not flattened", () => {
    const m = parseConversionRows([...H, row(lvl(5, "03110"), "A", lvl(5, "03310"), "Z"), row(lvl(5, "03120"), "B", lvl(5, "03310"), "Z")], "2018", "2025").mappings;
    assert.deepEqual(m.map((x) => x.relationship), ["many_to_one", "many_to_one"]);
    const mm = parseConversionRows(
      [...H, row(lvl(5, "10001"), "A", lvl(5, "20001"), "X"), row(E5, "", lvl(5, "20002"), "Y"), row(lvl(5, "10002"), "B", lvl(5, "20002"), "Y")],
      "2018",
      "2025",
    ).mappings;
    assert.deepEqual(mm.map((x) => x.relationship), ["one_to_many", "many_to_many", "many_to_one"]);
  });
  it("a code without a right-hand counterpart is reported unmapped, never invented", () => {
    const p = parseConversionRows([...H, row(lvl(5, "99999"), "Lẻ", E5, "")], "2018", "2025");
    assert.equal(p.mappings.length, 0);
    assert.deepEqual(p.unmappedFrom.map((u) => u.code), ["99999"]);
  });
  it("duplicate rows collapse to one pair", () => {
    const r = row(lvl(5, "01110"), "A", lvl(5, "01110"), "A");
    assert.equal(parseConversionRows([...H, r, r], "2018", "2025").mappings.length, 1);
  });
  it("mixed 4-digit + 5-digit row yields one pair per level", () => {
    const l = ["", "", "", "0111", "01110"];
    const p = parseConversionRows([...H, row(l, "Trồng lúa", l, "Trồng lúa")], "2018", "2025");
    assert.deepEqual(p.mappings.map((m) => m.level).sort(), [4, 5]);
  });
  it("malformed source is rejected", () => {
    assert.throws(() => parseConversionRows([...H, row(lvl(5, "0111"), "x", lvl(5, "01110"), "x")], "2018", "2025"), ConversionParseError);
    assert.throws(() => parseConversionRows([...H, ["a", "b", "c"]], "2018", "2025"), ConversionParseError);
    assert.throws(() => parseConversionRows([["VSIC 2025", "VSIC 2018"]], "2018", "2025"), /Header/);
  });
  it("a documented repair must match the raw text", () => {
    const rows = [...H, row(lvl(5, "01110"), "A", lvl(5, "01110"), "A")];
    assert.throws(() => parseConversionRows(rows, "2018", "2025", [{ row: 2, cell: 4, expect: "zzz", replaceWith: "", reason: "t" }]), /Repair mismatch/);
  });
});

describe("catalog parser", () => {
  const rows = [
    ["Cấp 1", "Cấp 2", "Cấp 3", "Cấp 4", "Cấp 5", "Tên ngành"],
    ["A", "", "", "", "", "NÔNG NGHIỆP"],
    ["", "01", "", "", "", "Nông nghiệp"],
    ["", "", "011", "", "", "Trồng cây hàng năm"],
    ["", "", "", "0111", "01110", "Trồng lúa"],
  ];
  it("derives parents and keeps leading zeros", () => {
    const e = parseCatalogRows(rows, "2025", "t");
    assert.deepEqual(e.map((x) => [x.code, x.parentCode]), [["A", undefined], ["01", "A"], ["011", "01"], ["0111", "011"], ["01110", "0111"]]);
  });
  it("rejects duplicates and orphans", () => {
    assert.throws(() => parseCatalogRows([...rows, ["", "", "", "", "01110", "Dup"]], "2025", "t"), /Duplicate/);
    assert.throws(() => parseCatalogRows([rows[0], ["A", "", "", "", "", "X"], ["", "", "", "", "01110", "Y"]], "2025", "t"), /parent/);
  });
  it("content: headings, exclusions, shared 4/5-digit heading", () => {
    const known = new Set(["0111", "01110", "0112"]);
    const m = parseContentParagraphs(["Preamble", "0111 - 01110: Trồng lúa", "Nhóm này gồm: lúa.", "Loại trừ:", "- ngô", "0112: Ngô", "Nhóm này gồm: ngô."], known);
    assert.deepEqual(m.get("01110")!.exclusions, ["Loại trừ:", "- ngô"]);
    assert.strictEqual(m.get("0111"), m.get("01110"));
    assert.deepEqual(m.get("0112")!.description, ["Nhóm này gồm: ngô."]);
  });
});

describe("VSIC 2025 catalog (official data)", () => {
  it("has the official level counts 22/87/259/495/743", () => {
    assert.deepEqual([1, 2, 3, 4, 5].map((l) => allVsic2025().filter((e) => e.level === l).length), [22, 87, 259, 495, 743]);
  });
  it("identity is version + code", () => {
    assert.equal(getVsic2025("4669"), undefined);
    assert.equal(getVsic2025("6201"), undefined);
    assert.equal(getVsicEntry("2018", "01110"), undefined);
    assert.equal(getVsicEntry("2025", "01110")?.name, "Trồng lúa");
  });
  it("leading zeros and parents", () => {
    assert.equal(getVsic2025("01110")!.parentCode, "0111");
    assert.deepEqual(ancestorsOf("01110").map((a) => a.code), ["A", "01", "011", "0111"]);
    assert.ok(childrenOf("011").length > 0);
    assert.equal(getVsic2025("K")?.level, 1);
  });
  it("matches the list used by the earlier audit", () => {
    const old = JSON.parse(readFileSync("data/vsic/vsic2025.json", "utf8")) as { code: string; level: number; name: string }[];
    assert.deepEqual(old.map((o) => `${o.code}|${o.level}|${o.name.replace(/\s+/g, " ")}`), allVsic2025().map((o) => `${o.code}|${o.level}|${o.name}`));
  });
  it("slug and search", () => {
    assert.equal(vsic2025Path(getVsic2025("62190")!), "/ma-nganh-2025/62190-lap-trinh-may-tinh-khac");
    assert.deepEqual(parseVsic2025Slug("k-hoat-dong"), { code: "K", slug: "hoat-dong" });
    assert.equal(parseVsic2025Slug("Abc"), null);
    assert.ok(searchVsic2025("62190").some((e) => e.code === "62190"));
    assert.ok(searchVsic2025("trong lua").some((e) => e.code === "01110"));
    assert.equal(foldVi("Đường"), "duong");
  });
  it("indexability rule is central and conservative", () => {
    const list = listIndexableVsic2025();
    assert.ok(list.length > 100 && list.length < allVsic2025().length);
    const e = getVsic2025("0111")!;
    assert.equal(isVsic2025PageIndexable(e, getVsic2025Content("0111"), childrenOf("0111")), false);
    assert.equal(isVsic2025PageIndexable({ ...e, version: "2018" }, { d: ["x".repeat(500)] }, []), false);
    assert.equal(isVsic2025PageIndexable(e, { d: ["ngắn"] }, []), false);
    assert.equal(isVsic2025PageIndexable(e, { d: ["ngắn"], x: ["Loại trừ: a"] }, []), true);
  });
});

describe("converter (official tables only)", () => {
  const found = (from: "2018" | "2025", code: string) => {
    const r = convertCode(from, code);
    assert.equal(r.status, "found");
    return r as Extract<typeof r, { status: "found" }>;
  };
  it("2018 -> 2025 values read from the official table", () => {
    assert.deepEqual(found("2018", "02101").targets.map((t) => [t.toCode, t.relationship]), [["02101", "one_to_one"]]);
    assert.deepEqual(found("2018", "4511").targets.map((t) => t.toCode), ["4661"]);
    assert.deepEqual(found("2018", "4669").targets.map((t) => t.toCode), ["4679"]);
    assert.deepEqual(found("2018", "1104").targets.map((t) => t.toCode), ["1105"]);
  });
  it("one code that splits is never resolved for the user", () => {
    const r = found("2018", "6201");
    assert.deepEqual(r.targets.map((t) => t.toCode), ["6211", "6219"]);
    assert.ok(r.targets.every((t) => t.relationship === "one_to_many"));
    assert.equal(r.needsReview, true);
    assert.ok(r.reviewNotes.some((n) => n.includes("Cần đối chiếu hoạt động thực tế")));
  });
  it("2025 -> 2018", () => {
    assert.deepEqual(found("2025", "62110").targets.map((t) => t.toCode), ["62010"]);
    assert.equal(found("2025", "4661").targets[0].toCode, "4511");
  });
  it("many-to-one lists the other source codes", () => {
    const r = found("2018", "03110");
    assert.ok(r.peers.some((p) => p.code === "03120"));
    assert.equal(r.needsReview, true);
  });
  it("code without its own official row falls back to the parent level and says so", () => {
    const r = found("2025", "56210");
    assert.equal(r.targets.length, 0);
    assert.ok(r.viaParent && r.viaParent.targets.length > 0);
    assert.equal(r.needsReview, true);
  });
  it("nonexistent and invalid codes", () => {
    assert.equal(convertCode("2018", "99998").status, "not_found");
    assert.equal(convertCode("2018", "xx").status, "invalid");
    assert.equal(convertCode("2025", "").status, "invalid");
  });
  it("accepts separators and searches by name", () => {
    assert.equal(convertCode("2018", " 62.01 ").status, "found");
    assert.ok(searchConversionNames("2018", "lap trinh may vi tinh").some((h) => h.code === "6201"));
  });
});
