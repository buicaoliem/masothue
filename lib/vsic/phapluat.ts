import { getVsic2025, vsic2025Slug } from "./catalog";
import { officialTargetsFor2018 } from "./convert";

// Outbound link to the same operator's legal handbook (camnangphapluat.com/nganh/<slug>, VSIC 2025 pages). Company data
// carries VSIC 2018 codes, so a link is only offered when the official 2018 → 2025 table maps the code to exactly ONE
// 2025 code; anything ambiguous gets no link. Slugs were checked against that site's catalog on 2026-10-24: 1,605 of
// 1,606 match vsic2025Slug(); the one exception is listed below as it is spelled there.
export const PHAPLUAT_ORIGIN = "https://camnangphapluat.com";
const SLUG_OVERRIDES: Record<string, string> = { "01182": "01182-trong-dau-cac-loaig55" };

export type PhapluatIndustryLink = { code: string; name: string; url: string };

export function phapluatIndustryLink(code2018: string): PhapluatIndustryLink | null {
  const targets = [...new Set(officialTargetsFor2018(code2018).map((m) => m.toCode))];
  if (targets.length !== 1) return null;
  const entry = getVsic2025(targets[0]);
  if (!entry) return null;
  const slug = SLUG_OVERRIDES[entry.code] ?? vsic2025Slug(entry.code, entry.name);
  return { code: entry.code, name: entry.name, url: `${PHAPLUAT_ORIGIN}/nganh/${slug}` };
}
