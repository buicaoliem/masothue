import assert from "node:assert/strict";
import { test } from "node:test";
import { validateMst } from "./mst";

test("MST thật hợp lệ — Vinamilk", () => {
  const r = validateMst("0300588569");
  assert.equal(r.valid, true);
});

test("MST thật hợp lệ — FPT", () => {
  const r = validateMst("0101248141");
  assert.equal(r.valid, true);
});

test("sai chữ số kiểm tra (đổi 1 chữ số) -> fail", () => {
  assert.equal(validateMst("0300588560").valid, false); // check digit 9 -> 0
  assert.equal(validateMst("0101248140").valid, false); // check digit 1 -> 0
});

test("sai độ dài -> fail", () => {
  assert.equal(validateMst("030058856").valid, false); // 9 digits
  assert.equal(validateMst("03005885699").valid, false); // 11 digits
});

test("MST 13 số (có chi nhánh) hợp lệ -> pass", () => {
  const withDash = validateMst("0101248141-001");
  assert.equal(withDash.valid, true);

  const noDash = validateMst("0101248141001");
  assert.equal(noDash.valid, true);
});

test("chi nhánh 000 -> fail", () => {
  assert.equal(validateMst("0101248141-000").valid, false);
});

test("chi nhánh nhưng phần gốc sai checksum -> fail", () => {
  assert.equal(validateMst("0101248140-001").valid, false);
});
