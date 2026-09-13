const COUNTRY_RE = /^(việt nam|viet nam|vietnam)$/i;

/**
 * Province/city = last comma-separated segment of the address, whitespace collapsed.
 * A trailing country segment ("Việt Nam") is skipped. Null when the address has no comma.
 */
export function provinceFromAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (parts.length > 1 && COUNTRY_RE.test(parts[parts.length - 1])) parts.pop();
  return parts.length > 1 ? parts[parts.length - 1] : null;
}
