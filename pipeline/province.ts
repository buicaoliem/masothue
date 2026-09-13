// Province catalog after the 2025 merger (Nghị quyết 202/2025/QH15, effective 2025-07-01): 34 units.
// `code` = 2-digit administrative code of the merged unit; `formerNames` = provinces merged into it.

export interface Province {
  code: string;
  name: string;
  formerNames: string[];
}

export const PROVINCES: readonly Province[] = [
  { code: "01", name: "Hà Nội", formerNames: [] },
  { code: "04", name: "Cao Bằng", formerNames: [] },
  { code: "08", name: "Tuyên Quang", formerNames: ["Hà Giang"] },
  { code: "11", name: "Điện Biên", formerNames: [] },
  { code: "12", name: "Lai Châu", formerNames: [] },
  { code: "14", name: "Sơn La", formerNames: [] },
  { code: "15", name: "Lào Cai", formerNames: ["Yên Bái"] },
  { code: "19", name: "Thái Nguyên", formerNames: ["Bắc Kạn"] },
  { code: "20", name: "Lạng Sơn", formerNames: [] },
  { code: "22", name: "Quảng Ninh", formerNames: [] },
  { code: "24", name: "Bắc Ninh", formerNames: ["Bắc Giang"] },
  { code: "25", name: "Phú Thọ", formerNames: ["Vĩnh Phúc", "Hòa Bình"] },
  { code: "31", name: "Hải Phòng", formerNames: ["Hải Dương"] },
  { code: "33", name: "Hưng Yên", formerNames: ["Thái Bình"] },
  { code: "37", name: "Ninh Bình", formerNames: ["Hà Nam", "Nam Định"] },
  { code: "38", name: "Thanh Hóa", formerNames: [] },
  { code: "40", name: "Nghệ An", formerNames: [] },
  { code: "42", name: "Hà Tĩnh", formerNames: [] },
  { code: "44", name: "Quảng Trị", formerNames: ["Quảng Bình"] },
  { code: "46", name: "Huế", formerNames: ["Thừa Thiên Huế"] },
  { code: "48", name: "Đà Nẵng", formerNames: ["Quảng Nam"] },
  { code: "51", name: "Quảng Ngãi", formerNames: ["Kon Tum"] },
  { code: "52", name: "Gia Lai", formerNames: ["Bình Định"] },
  { code: "56", name: "Khánh Hòa", formerNames: ["Ninh Thuận"] },
  { code: "66", name: "Đắk Lắk", formerNames: ["Phú Yên"] },
  { code: "68", name: "Lâm Đồng", formerNames: ["Đắk Nông", "Bình Thuận"] },
  { code: "75", name: "Đồng Nai", formerNames: ["Bình Phước"] },
  { code: "79", name: "Hồ Chí Minh", formerNames: ["Bình Dương", "Bà Rịa - Vũng Tàu"] },
  { code: "80", name: "Tây Ninh", formerNames: ["Long An"] },
  { code: "82", name: "Đồng Tháp", formerNames: ["Tiền Giang"] },
  { code: "86", name: "Vĩnh Long", formerNames: ["Bến Tre", "Trà Vinh"] },
  { code: "91", name: "An Giang", formerNames: ["Kiên Giang"] },
  { code: "92", name: "Cần Thơ", formerNames: ["Sóc Trăng", "Hậu Giang"] },
  { code: "96", name: "Cà Mau", formerNames: ["Bạc Liêu"] },
];

// Extra spellings seen in addresses, keyed to the current province name.
const ALIASES: Record<string, string[]> = {
  "Hồ Chí Minh": ["HCM", "TPHCM", "HCMC", "Hồ Chí Minh City", "Ho Chi Minh City"],
  "Bà Rịa - Vũng Tàu": ["BRVT", "Bà Rịa Vũng Tàu"],
  "Thừa Thiên Huế": ["TT Huế", "Thừa Thiên"],
  "Đắk Lắk": ["Đắc Lắc", "Daklak"],
  "Đắk Nông": ["Đắc Nông", "Daknong"],
  "Bắc Kạn": ["Bắc Cạn"],
  "Kon Tum": ["Kontum"],
};

function key(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// "Tỉnh", "Thành phố", "TP", "TP." prefixes, compared on the de-accented key.
const PREFIX_RE = /^(tinh|thanh pho|tp|t p)\s+/;
const COUNTRY_KEYS = new Set(["viet nam", "vietnam", "vn"]);

const LOOKUP = new Map<string, Province>();
for (const p of PROVINCES) {
  for (const n of [p.name, ...p.formerNames]) {
    for (const spelling of [n, ...(ALIASES[n] ?? [])]) {
      LOOKUP.set(key(spelling), p);
      LOOKUP.set(key(spelling).replace(/ /g, ""), p); // "tphcm", "bariavungtau"
    }
  }
}

/** Map a raw province string (e.g. "TP. Hồ Chí Minh", "Tỉnh Bình Dương") to a current province, or null. */
export function normalizeProvince(raw: string | null): Province | null {
  if (!raw) return null;
  const k = key(raw);
  const bare = k.replace(PREFIX_RE, "");
  return LOOKUP.get(k) ?? LOOKUP.get(bare) ?? LOOKUP.get(bare.replace(/ /g, "")) ?? null;
}

/** Last comma-separated segment of an address, skipping a trailing country segment. */
export function addressTail(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1 && COUNTRY_KEYS.has(key(parts[parts.length - 1]))) parts.pop();
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

export function provinceFromAddress(address: string | null): Province | null {
  return normalizeProvince(addressTail(address));
}
