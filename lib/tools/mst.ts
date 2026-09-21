// Validate MST (mã số thuế) structure + check digit.
// Structure (N1N2, N3..N9, N10 check digit, N11..N13 branch): Thông tư 90/2026/TT-BTC Điều 5 (current). That text
// covers the structure only; it does not define the weights below.
// Check-digit algorithm (modulus 11, weights 31,29,23,19,17,13,7,5,3): not traced to an official legal text. Verified
// empirically against 5,000 real MSTs from the directory (0 mismatches). Do not claim a legal basis for the weights
// until an official source is found. A passing check means "well-formed", never that the MST was issued or is active.

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
    return { valid: false, reason: "Chữ số kiểm tra không khớp — có thể đã nhập sai một chữ số." };
  }

  return { valid: true, normalized: branch ? `${base}-${branch}` : base, base, branch };
}
