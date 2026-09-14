import assert from "node:assert/strict";
import { test } from "node:test";
import { computePit, computeTaxBrackets } from "./pit";

test("mốc thuế theo thu nhập tính thuế (TNTT)", () => {
  assert.equal(computeTaxBrackets(10_000_000).tax, 500_000);
  assert.equal(computeTaxBrackets(30_000_000).tax, 2_500_000);
  assert.equal(computeTaxBrackets(60_000_000).tax, 8_500_000);
  assert.equal(computeTaxBrackets(100_000_000).tax, 20_500_000);
  assert.equal(computeTaxBrackets(150_000_000).tax, 38_000_000);
});

test("tổng thuế từng bậc khớp tổng thuế trả về", () => {
  for (const income of [10_000_000, 30_000_000, 60_000_000, 100_000_000, 150_000_000]) {
    const { tax, rows } = computeTaxBrackets(income);
    assert.equal(
      rows.reduce((sum, r) => sum + r.tax, 0),
      tax,
    );
  }
});

test("giảm trừ gia cảnh: 20tr thu nhập, 0 phụ thuộc -> TNTT 4,5tr, thuế 225.000", () => {
  const r = computePit(20_000_000, 0);
  assert.equal(r.taxableIncome, 4_500_000);
  assert.equal(r.tax, 225_000);
});

test("giảm trừ gia cảnh: 20tr thu nhập, 1 phụ thuộc -> TNTT âm -> thuế 0", () => {
  const r = computePit(20_000_000, 1);
  assert.equal(r.taxableIncome, 0);
  assert.equal(r.tax, 0);
});

test("thu nhập chịu thuế = 0 -> không có bậc nào", () => {
  const r = computePit(0, 0);
  assert.equal(r.tax, 0);
  assert.deepEqual(r.rows, []);
});
