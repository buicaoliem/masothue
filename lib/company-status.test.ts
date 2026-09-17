import assert from "node:assert/strict";
import { test } from "node:test";
import { isActiveStatus, statusTone } from "./company-status";

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
