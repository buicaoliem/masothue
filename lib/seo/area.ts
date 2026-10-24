import { normalizeProvince } from "@/pipeline/province";
import { slugify } from "./slug";

// Area (district / ward) read straight from the registered address text. Company.district / Company.ward are empty in every
// source, so the address is the only place this exists. Nothing is guessed: a segment counts only when it carries an
// administrative prefix ("Huyện", "Phường", ...) in the expected position (ward, district, province, [Việt Nam]).
// Addresses are written in the pre-01/07/2025 boundaries (districts were abolished on that date), so districts are
// shown as "former" units; the province is the post-merger unit from pipeline/province.ts.

export type AreaUnit = { name: string; slug: string };
export type AddressArea = {
  district: AreaUnit | null;
  ward: AreaUnit | null;
  /** Province name exactly as written in the address when it is a pre-merger unit (e.g. "Tỉnh Kon Tum"); null otherwise. */
  formerProvince: string | null;
};

const DISTRICT_PREFIXES = ["Quận", "Huyện", "Thị xã", "Thành phố", "TP"];
const WARD_PREFIXES = ["Phường", "Xã", "Thị trấn"];

const fold = (s: string) => s.normalize("NFC").toLocaleLowerCase("vi");

/** "THỊ TRẤN La Hà" / "Thị Trấn La Hà" → "Thị trấn La Hà"; "Phường 07" → "Phường 7". null when no known prefix. */
function unit(segment: string, prefixes: string[]): AreaUnit | null {
  const s = segment.replace(/\s+/g, " ").trim();
  for (const prefix of prefixes) {
    const p = fold(prefix);
    const head = fold(s.slice(0, p.length));
    const rest = s.slice(p.length);
    // "TP" also appears as "TP." in some rows.
    const body = rest.replace(/^\.\s*/, " ");
    if (head !== p || !/^\s/.test(body)) continue;
    let tail = body.trim();
    if (!tail) return null;
    tail = /^\d+$/.test(tail) ? String(Number(tail)) : tail;
    const label = prefix === "TP" ? "Thành phố" : prefix;
    const name = `${label} ${tail}`;
    return { name, slug: slugify(name) };
  }
  return null;
}

export function parseAddressArea(address: string | null | undefined): AddressArea {
  const none: AddressArea = { district: null, ward: null, formerProvince: null };
  if (!address) return none;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1 && /^viet ?nam$/.test(fold(parts[parts.length - 1]).normalize("NFD").replace(/\p{M}/gu, ""))) parts.pop();
  if (parts.length < 2) return none;

  const provinceRaw = parts[parts.length - 1];
  const province = normalizeProvince(provinceRaw);
  if (!province) return none;
  const bare = provinceRaw.replace(/^(tỉnh|thành phố|tp\.?)\s+/i, "").trim();
  const formerProvince = fold(bare) !== fold(province.name) && !/h[oồ] ch[ií] minh|hcm/i.test(bare) ? provinceRaw : null;

  // "Thành phố Quảng Ngãi, Tỉnh Quảng Ngãi" is a real (city-level) district, so no same-name filter here.
  const district = unit(parts[parts.length - 2], DISTRICT_PREFIXES);
  const wardSegment = district ? parts[parts.length - 3] : parts[parts.length - 2];
  const ward = wardSegment ? unit(wardSegment, WARD_PREFIXES) : null;
  return { district, ward, formerProvince };
}
