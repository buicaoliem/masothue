import assert from "node:assert/strict";
import { test } from "node:test";
import { computeOvertime, hourlyWageFromMonthly, type OvertimeHours } from "./overtime";

const ZERO: OvertimeHours = {
  weekdayDay: 0,
  weekdayNight: 0,
  weeklyRestDay: 0,
  weeklyRestNight: 0,
  holidayDay: 0,
  holidayNight: 0,
};

test("50.000đ/giờ, 2h ban đêm ngày thường, không làm thêm ban ngày trước đó -> 200.000", () => {
  const r = computeOvertime(50_000, { ...ZERO, weekdayNight: 2 }, false);
  assert.equal(r.lines.find((l) => l.key === "weekdayNight")!.amount, 200_000);
  assert.equal(r.total, 200_000);
});

test("50.000đ/giờ, 2h ban đêm ngày thường, có làm thêm ban ngày trước đó -> 210.000", () => {
  const r = computeOvertime(50_000, { ...ZERO, weekdayNight: 2 }, true);
  assert.equal(r.lines.find((l) => l.key === "weekdayNight")!.amount, 210_000);
  assert.equal(r.total, 210_000);
});

test("lương tháng 10.400.000, 26 ngày, 8 giờ/ngày -> lương giờ 50.000", () => {
  assert.equal(hourlyWageFromMonthly(10_400_000), 50_000);
});

test("1h lễ tết ban đêm ở 50.000đ/giờ -> 195.000", () => {
  const r = computeOvertime(50_000, { ...ZERO, holidayNight: 1 }, false);
  assert.equal(r.lines.find((l) => l.key === "holidayNight")!.amount, 195_000);
});

test("3h nghỉ hằng tuần ban ngày ở 50.000đ/giờ -> 300.000", () => {
  const r = computeOvertime(50_000, { ...ZERO, weeklyRestDay: 3 }, false);
  assert.equal(r.lines.find((l) => l.key === "weeklyRestDay")!.amount, 300_000);
});
