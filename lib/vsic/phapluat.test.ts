import assert from "node:assert/strict";
import { test } from "node:test";
import { officialTargetsFor2018 } from "./convert";
import { phapluatIndustryLink } from "./phapluat";

test("a 2018 code with one official 2025 target links to that page", () => {
  const code = ["6201", "4100", "5610", "4933"].find((c) => new Set(officialTargetsFor2018(c).map((m) => m.toCode)).size === 1);
  assert.ok(code, "fixture: at least one one-to-one code");
  const link = phapluatIndustryLink(code!)!;
  assert.match(link.url, /^https:\/\/camnangphapluat\.com\/nganh\/\d{4,5}-[a-z0-9-]+$/);
});

test("unknown or ambiguous codes get no link", () => {
  assert.equal(phapluatIndustryLink("99999999"), null);
});
