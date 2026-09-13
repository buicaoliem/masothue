// Province catalog after the 2025 merger: 34 units (6 centrally-run cities + 28 provinces).
// Source of truth: table approved by the product owner (session MST-2a-fix3). Do not edit by guesswork.

export type ProvinceKind = "city" | "province";

export interface Province {
  slug: string;
  /** Base name used for matching, e.g. "Hà Nội". */
  name: string;
  kind: ProvinceKind;
  /** Display name: "TP. Hà Nội" for cities, plain name for provinces. */
  displayName: string;
}

const CITIES: [string, string][] = [
  ["Hà Nội", "ha-noi"], ["Hải Phòng", "hai-phong"], ["Huế", "hue"],
  ["Đà Nẵng", "da-nang"], ["Hồ Chí Minh", "ho-chi-minh"], ["Cần Thơ", "can-tho"],
];

const PROVINCE_LIST: [string, string][] = [
  ["An Giang", "an-giang"], ["Bắc Ninh", "bac-ninh"], ["Cà Mau", "ca-mau"], ["Cao Bằng", "cao-bang"],
  ["Đắk Lắk", "dak-lak"], ["Điện Biên", "dien-bien"], ["Đồng Nai", "dong-nai"], ["Đồng Tháp", "dong-thap"],
  ["Gia Lai", "gia-lai"], ["Hà Tĩnh", "ha-tinh"], ["Hưng Yên", "hung-yen"], ["Khánh Hòa", "khanh-hoa"],
  ["Lai Châu", "lai-chau"], ["Lâm Đồng", "lam-dong"], ["Lạng Sơn", "lang-son"], ["Lào Cai", "lao-cai"],
  ["Nghệ An", "nghe-an"], ["Ninh Bình", "ninh-binh"], ["Phú Thọ", "phu-tho"], ["Quảng Ngãi", "quang-ngai"],
  ["Quảng Ninh", "quang-ninh"], ["Quảng Trị", "quang-tri"], ["Sơn La", "son-la"], ["Tây Ninh", "tay-ninh"],
  ["Thái Nguyên", "thai-nguyen"], ["Thanh Hóa", "thanh-hoa"], ["Tuyên Quang", "tuyen-quang"], ["Vĩnh Long", "vinh-long"],
];

export const PROVINCES: readonly Province[] = [
  ...CITIES.map(([name, slug]) => ({ slug, name, kind: "city" as const, displayName: `TP. ${name}` })),
  ...PROVINCE_LIST.map(([name, slug]) => ({ slug, name, kind: "province" as const, displayName: name })),
];

/** Former (pre-merger) province → slug of the current unit. Units not listed kept their name. */
export const FORMER_PROVINCES: Record<string, string> = {
  "Hà Giang": "tuyen-quang",
  "Yên Bái": "lao-cai",
  "Bắc Kạn": "thai-nguyen",
  "Vĩnh Phúc": "phu-tho",
  "Hòa Bình": "phu-tho",
  "Bắc Giang": "bac-ninh",
  "Thái Bình": "hung-yen",
  "Hải Dương": "hai-phong",
  "Hà Nam": "ninh-binh",
  "Nam Định": "ninh-binh",
  "Quảng Bình": "quang-tri",
  "Quảng Nam": "da-nang",
  "Kon Tum": "quang-ngai",
  "Bình Định": "gia-lai",
  "Ninh Thuận": "khanh-hoa",
  "Đắk Nông": "lam-dong",
  "Bình Thuận": "lam-dong",
  "Phú Yên": "dak-lak",
  "Bình Dương": "ho-chi-minh",
  "Bà Rịa-Vũng Tàu": "ho-chi-minh",
  "Bình Phước": "dong-nai",
  "Long An": "tay-ninh",
  "Sóc Trăng": "can-tho",
  "Hậu Giang": "can-tho",
  "Bến Tre": "vinh-long",
  "Trà Vinh": "vinh-long",
  "Tiền Giang": "dong-thap",
  "Bạc Liêu": "ca-mau",
  "Kiên Giang": "an-giang",
};

/** Lowercase, strip diacritics, đ→d, non-alphanumerics → single space. */
function key(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// "Tỉnh", "Thành phố", "TP", "TP." / "T.P" prefixes, on the de-accented key.
const PREFIX_RE = /^(tinh|thanh pho|tp|t p)\s+/;
const COUNTRY_KEYS = new Set(["viet nam", "vietnam"]);

const BY_SLUG = new Map(PROVINCES.map((p) => [p.slug, p]));
const LOOKUP = new Map<string, Province>();
for (const p of PROVINCES) LOOKUP.set(key(p.name), p);
for (const [former, slug] of Object.entries(FORMER_PROVINCES)) LOOKUP.set(key(former), BY_SLUG.get(slug)!);
/**
 * Unambiguous spellings/abbreviations → slug (matched after prefix stripping and de-accenting,
 * so "TP.HCM", "TP HCM", "Thành phố HCM" all reduce to "hcm").
 * Never add abbreviations that could mean more than one unit (e.g. "ĐN" = Đà Nẵng or Đồng Nai,
 * "HP", "CT"): those must stay unmatched (null).
 */
export const PROVINCE_ALIASES: Record<string, string> = {
  // Old official name of Huế before it became a centrally-run city.
  "Thừa Thiên Huế": "hue",
  "TT Huế": "hue",
  "TPHCM": "ho-chi-minh",
  "HCM": "ho-chi-minh",
  "HCMC": "ho-chi-minh",
  "Hồ Chí Minh City": "ho-chi-minh",
  "Sài Gòn": "ho-chi-minh",
  "Saigon": "ho-chi-minh",
  "HN": "ha-noi",
  "Hanoi": "ha-noi",
  "Danang": "da-nang",
  "Haiphong": "hai-phong",
};
for (const [alias, slug] of Object.entries(PROVINCE_ALIASES)) LOOKUP.set(key(alias), BY_SLUG.get(slug)!);

/** Map a raw province string ("TP Hà Nội", "Tỉnh Bình Dương") to one of the 34 units, or null. */
export function normalizeProvince(raw: string | null): Province | null {
  if (!raw) return null;
  const k = key(raw);
  return LOOKUP.get(k) ?? LOOKUP.get(k.replace(PREFIX_RE, "")) ?? null;
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
