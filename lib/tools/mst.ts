// Validate MST (mã số thuế) format + check-digit per Thông tư 105/2020/TT-BTC.
// Structure: 10-digit base (9 body digits + 1 check digit), optionally a 3-digit branch suffix.

export type MstValidation =
  | { valid: true; normalized: string; base: string; branch: string | null }
  | { valid: false; reason: string };

const WEIGHTS = [31, 29, 23, 19, 17, 13, 7, 5, 3];

function checkDigit(body9: string): number {
  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * Number(body9[i]), 0);
  return (10 - (sum % 11)) % 10;
}

export function validateMst(raw: string): MstValidation {
  const cleaned = raw.replace(/\s+/g, "");
  if (cleaned === "" || !/^[\d-]+$/.test(cleaned)) {
    return { valid: false, reason: "Mã số thuế chỉ gồm chữ số (và dấu gạch ngang cho chi nhánh)." };
  }

  let base: string;
  let branch: string | null;

  if (cleaned.includes("-")) {
    const parts = cleaned.split("-");
    if (parts.length !== 2) return { valid: false, reason: "Định dạng không hợp lệ." };
    [base, branch] = parts;
  } else if (cleaned.length === 13) {
    base = cleaned.slice(0, 10);
    branch = cleaned.slice(10);
  } else {
    base = cleaned;
    branch = null;
  }

  if (!/^\d{10}$/.test(base)) {
    return { valid: false, reason: "Mã số thuế phải gồm đúng 10 chữ số." };
  }
  if (branch !== null && !/^\d{3}$/.test(branch)) {
    return { valid: false, reason: "Mã chi nhánh phải gồm đúng 3 chữ số." };
  }
  if (branch === "000") {
    return { valid: false, reason: "Mã chi nhánh không được là 000." };
  }

  if (checkDigit(base.slice(0, 9)) !== Number(base[9])) {
    return { valid: false, reason: "Chữ số kiểm tra không khớp — mã số thuế không tồn tại." };
  }

  return { valid: true, normalized: branch ? `${base}-${branch}` : base, base, branch };
}
