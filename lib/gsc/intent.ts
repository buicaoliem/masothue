import { PROVINCES } from "@/pipeline/province";
import { strip } from "./parse";

// Deterministic search-intent classification for masothuedn.com queries. Rules run in priority order on the
// accent-stripped, lowercased query; the first match wins. No model involved: every label is explainable.

export type Intent =
  | "tax-code lookup"
  | "company status"
  | "representative"
  | "address"
  | "industry"
  | "tool/calculator"
  | "tax/accounting"
  | "legal/how-to"
  | "province"
  | "company lookup"
  | "other";

/** How close an intent is to what the product serves (used to weight opportunities). */
export const INTENT_RELEVANCE: Record<Intent, number> = {
  "tax-code lookup": 1,
  "company lookup": 1,
  "company status": 0.9,
  representative: 0.6,
  address: 0.7,
  industry: 0.8,
  province: 0.7,
  "tool/calculator": 0.9,
  "tax/accounting": 0.8,
  "legal/how-to": 0.7,
  other: 0.3,
};

const PROVINCE_KEYS = PROVINCES.map((p) => strip(p.name));
const has = (q: string, re: RegExp) => re.test(q);

export function classifyIntent(rawQuery: string): Intent {
  const q = strip(rawQuery).replace(/\s+/g, " ");
  if (!q) return "other";
  if (has(q, /\b\d{10}(-?\d{3})?\b/)) return "tax-code lookup";
  if (has(q, /\b(con hoat dong|tam ngung|ngung hoat dong|giai the|dong (ma so thue|mst)|dong cua|trang thai|bi khoa|khong con hoat dong)\b/)) return "company status";
  if (has(q, /\b(nguoi dai dien|giam doc|chu tich|chu so huu|dai dien phap luat)\b/)) return "representative";
  if (has(q, /\b(dia chi|tru so|o dau|dia chi tru so)\b/)) return "address";
  if (has(q, /\b(ma nganh|nganh nghe|vsic|nganh kinh te|nganh kinh doanh)\b/)) return "industry";
  if (has(q, /\b(tinh (luong|thue|vat|tncn|gross|net|lam them|tien cham nop)|cong cu|calculator|doi so thanh chu|tao (ma )?qr|vietqr|kiem tra ma so thue|gross net)\b/)) return "tool/calculator";
  if (has(q, /\b(la gi|cach|huong dan|nhu the nao|quy dinh|thu tuc|khac nhau|co phai|bao nhieu)\b/)) return "legal/how-to";
  if (has(q, /\b(thue|tncn|vat|gtgt|bhxh|bhyt|bhtn|luong|giam tru|hoa don|ke toan|khai thue|quyet toan)\b/)) return "tax/accounting";
  const mentionsProvince = PROVINCE_KEYS.some((p) => q.includes(p));
  if (mentionsProvince && has(q, /\b(doanh nghiep|cong ty|tra cuu|danh sach|ma so thue|mst)\b/) && !has(q, /\b(tnhh|co phan|cp)\s+\S+\s+\S+/)) return "province";
  if (has(q, /\b(cong ty|tnhh|co phan|doanh nghiep tu nhan|dntn|hop danh)\b/)) return "company lookup";
  if (has(q, /\b(ma so thue|mst|tra cuu)\b/) && q.split(" ").length >= 4) return "company lookup";
  return "other";
}
