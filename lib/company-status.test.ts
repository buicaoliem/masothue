import assert from "node:assert/strict";
import { test } from "node:test";
import { companyAge, explainStatus, isActiveStatus, statusTone } from "./company-status";

test("tax-office active wording is active", () => {
  assert.equal(statusTone("NNT đang hoạt động"), "active");
  assert.ok(isActiveStatus("NNT đang hoạt động"));
});

test("registry active wording is active", () => {
  assert.equal(statusTone("Đang hoạt động"), "active");
  assert.ok(isActiveStatus("Đang hoạt động"));
});

test("tax-office stopped/dissolved wording is stopped", () => {
  assert.equal(statusTone("NNT ngừng hoạt động và đã hoàn thành thủ tục chấm dứt hiệu lực MST"), "stopped");
  assert.equal(statusTone("NNT tạm ngừng KD có thời hạn"), "stopped");
  assert.equal(statusTone("NNT không hoạt động tại địa chỉ đã đăng ký"), "stopped");
});

test("registry stopped/dissolved wording is stopped", () => {
  assert.equal(statusTone("Tạm ngừng kinh doanh"), "stopped");
  assert.equal(statusTone("Đã giải thể, phá sản, chấm dứt tồn tại"), "stopped");
  assert.equal(statusTone("Đang làm thủ tục giải thể, đã bị chia, bị hợp nhất, bị sáp nhập"), "stopped");
});

test("unrecognized wording is neutral", () => {
  assert.equal(statusTone("Không rõ"), "neutral");
  assert.ok(!isActiveStatus("Không rõ"));
});

test("every status wording present in the data has a plain explanation", () => {
  for (const s of [
    "Đang hoạt động", "NNT đang hoạt động", "Đang hoạt động (đã được cấp GCN ĐKT)", "Tạm ngừng kinh doanh", "NNT tạm ngừng KD có thời hạn",
    "Đã giải thể, phá sản, chấm dứt tồn tại", "Bị thu hồi giấy chứng nhận đăng ký doanh nghiệp do cưỡng chế về quản lý thuế",
    "Không còn hoạt động kinh doanh tại địa chỉ đã đăng ký", "NNT không hoạt động tại địa chỉ đã đăng ký",
    "Đang làm thủ tục giải thể, đã bị chia, bị hợp nhất, bị sáp nhập", "NNT ngừng hoạt động và đã hoàn thành thủ tục chấm dứt hiệu lực MST",
    "NNT ngừng HĐ nhưng chưa hoàn thành thủ tục chấm dứt hiệu lực MST", "NNT chờ xác minh tình trạng hoạt động tại địa chỉ đã đăng ký",
  ]) assert.ok(explainStatus(s), s);
  assert.equal(explainStatus("Trạng thái lạ"), null);
  assert.equal(explainStatus(null), null);
});

test("company age counts whole months", () => {
  const now = new Date("2026-10-24T00:00:00Z");
  assert.equal(companyAge(new Date("2019-07-01"), now), "7 năm 3 tháng");
  assert.equal(companyAge(new Date("2026-05-25"), now), "4 tháng");
  assert.equal(companyAge(new Date("2016-10-24"), now), "10 năm");
  assert.equal(companyAge(new Date("2026-10-01"), now), null);
  assert.equal(companyAge(null, now), null);
});
