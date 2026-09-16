import assert from "node:assert/strict";
import { test } from "node:test";
import { annualDeadline, computeLatePayment, monthlyDeadline, quarterlyDeadline } from "./late-payment";

test("50.000.000, hạn 20/05/2026, nộp 11/06/2026 -> 21 ngày, 315.000", () => {
  const r = computeLatePayment(50_000_000, "2026-05-20", "2026-06-11");
  assert.equal(r.days, 21);
  assert.equal(r.lateAmount, 315_000);
  assert.equal(r.totalDue, 50_315_000);
});

test("nộp đúng hạn -> 0 ngày, 0 tiền chậm nộp", () => {
  const r = computeLatePayment(50_000_000, "2026-05-20", "2026-05-20");
  assert.equal(r.days, 0);
  assert.equal(r.lateAmount, 0);
});

test("nộp ngày liền sau hạn -> 0 ngày", () => {
  const r = computeLatePayment(50_000_000, "2026-05-20", "2026-05-21");
  assert.equal(r.days, 0);
  assert.equal(r.lateAmount, 0);
});

test("hạn 31/01/2026, nộp 02/03/2026 -> 29 ngày (2026 không nhuận)", () => {
  const r = computeLatePayment(50_000_000, "2026-01-31", "2026-03-02");
  assert.equal(r.days, 29);
});

test("hạn nộp theo tháng: ngày 20 tháng sau", () => {
  assert.equal(monthlyDeadline(2026, 3), "2026-04-20");
  assert.equal(monthlyDeadline(2026, 12), "2027-01-20");
});

test("hạn nộp theo quý: ngày cuối tháng đầu quý sau", () => {
  assert.equal(quarterlyDeadline(2026, 1), "2026-04-30");
  assert.equal(quarterlyDeadline(2026, 4), "2027-01-31");
});

test("hạn quyết toán năm: ngày cuối tháng thứ 3 năm sau", () => {
  assert.equal(annualDeadline(2025), "2026-03-31");
});
