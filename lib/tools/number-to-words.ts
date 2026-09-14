// Vietnamese amount in words, accounting style: 1234000 -> "Một triệu hai trăm ba mươi tư nghìn đồng".
// A zero hundreds digit inside the number is read out (MISA style): 1005000 -> "một triệu không trăm lẻ năm nghìn".
// All-zero groups are skipped: 1000000005 -> "một tỷ không trăm lẻ năm".

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const GROUP_UNITS = ["", "nghìn", "triệu"];

export const MAX_DIGITS = 15; // up to 999.999.999.999.999 (under one "triệu tỷ")

/** Words for a 3-digit group. `inner` = a higher non-zero group precedes it. */
function readGroup(n: number, inner: boolean): string[] {
  const h = Math.floor(n / 100);
  const t = Math.floor(n / 10) % 10;
  const u = n % 10;
  const words: string[] = [];
  if (h > 0 || inner) words.push(DIGITS[h], "trăm");
  if (t === 0) {
    if (u > 0 && (h > 0 || inner)) words.push("lẻ");
  } else if (t === 1) {
    words.push("mười");
  } else {
    words.push(DIGITS[t], "mươi");
  }
  if (u === 1) words.push(t > 1 ? "mốt" : "một");
  else if (u === 4) words.push(t > 1 ? "tư" : "bốn");
  else if (u === 5) words.push(t > 0 ? "lăm" : "năm");
  else if (u > 0) words.push(DIGITS[u]);
  return words;
}

/** Words for a digit string below one billion (at most 9 digits). */
function readBelowBillion(digits: string, inner: boolean): string[] {
  const groups: number[] = [];
  for (let end = digits.length; end > 0; end -= 3) groups.unshift(Number(digits.slice(Math.max(0, end - 3), end)));
  const words: string[] = [];
  groups.forEach((g, i) => {
    if (g === 0) return;
    words.push(...readGroup(g, inner || words.length > 0), GROUP_UNITS[groups.length - 1 - i]);
  });
  return words.filter(Boolean);
}

/** Words for any digit string, split on "tỷ" (so 10^12 reads "nghìn tỷ"). */
function readDigits(digits: string, inner: boolean): string[] {
  if (digits.length <= 9) return readBelowBillion(digits, inner);
  const high = digits.slice(0, -9);
  const low = digits.slice(-9);
  const words = [...readDigits(high, inner), "tỷ"];
  return [...words, ...readBelowBillion(low, true)];
}

/** Digits only, without leading zeros; "" when there are none. */
export const onlyDigits = (input: string) => input.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

/** Sentence for a digit string (e.g. "1005000"), or null if empty / too long. */
export function amountToWords(digits: string): string | null {
  if (!/^\d+$/.test(digits) || digits.length > MAX_DIGITS) return null;
  const clean = digits.replace(/^0+/, "");
  const text = clean ? readDigits(clean, false).join(" ") : "không";
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`;
}
