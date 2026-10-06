// Client IP behind Railway, optionally behind Cloudflare. Master copy: D:\data\migrate-railway\cf-client-ip\
// (copied into each repo; keep the range list in sync with https://www.cloudflare.com/ips/).
//
// Rule: the "connecting hop" is what Railway's edge saw as its TCP peer: `x-real-ip`, else the LAST
// `x-forwarded-for` entry (earlier entries are client-supplied and not reliable).
//  - hop is inside a published Cloudflare range  -> trust `CF-Connecting-IP` (when it is a valid IP)
//  - otherwise (direct Railway request, spoofed CF header from any other hop) -> the hop itself.
// On Vercel (dual-run) the headers carry the real client in x-real-ip / a single x-forwarded-for entry,
// which is not a Cloudflare address, so the result is the same as before.

// Cloudflare ranges, https://www.cloudflare.com/ips-v4 and /ips-v6 (fetched 2026-10-05).
export const CLOUDFLARE_IPV4 = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18",
  "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17",
  "162.158.0.0/15", "104.16.0.0/13", "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
] as const;
export const CLOUDFLARE_IPV6 = [
  "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32", "2405:8100::/32",
  "2a06:98c0::/29", "2c0f:f248::/32",
] as const;

// BigInt() calls instead of literals: several repos compile with target ES2017 (literals need ES2020).
const ZERO = BigInt(0);
const EIGHT = BigInt(8);
const SIXTEEN = BigInt(16);
const THIRTY_TWO = BigInt(32);

type Parsed = { v: 4 | 6; n: bigint };

function parseV4(s: string): bigint | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  let n = ZERO;
  for (let i = 1; i <= 4; i++) {
    const o = Number(m[i]);
    if (o > 255) return null;
    n = (n << EIGHT) | BigInt(o);
  }
  return n;
}

function parseV6(s: string): bigint | null {
  if (!s.includes(":") || !/^[0-9a-fA-F:.]+$/.test(s)) return null;
  let head = s;
  let tail4: bigint | null = null;
  const lastColon = s.lastIndexOf(":");
  if (s.includes(".")) {
    tail4 = parseV4(s.slice(lastColon + 1));
    if (tail4 === null) return null;
    head = s.slice(0, lastColon + 1) + "0:0";
  }
  const halves = head.split("::");
  if (halves.length > 2) return null;
  const toGroups = (part: string) => (part === "" ? [] : part.split(":"));
  const a = toGroups(halves[0]);
  const b = halves.length === 2 ? toGroups(halves[1]) : [];
  if (halves.length === 1 && a.length !== 8) return null;
  if (halves.length === 2 && a.length + b.length > 7) return null;
  const groups = halves.length === 2 ? [...a, ...Array(8 - a.length - b.length).fill("0"), ...b] : a;
  let n = ZERO;
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    n = (n << SIXTEEN) | BigInt(parseInt(g, 16));
  }
  if (tail4 !== null) n = ((n >> THIRTY_TWO) << THIRTY_TWO) | tail4;
  return n;
}

/** Normalise one address string: trims, drops brackets/port, unmaps ::ffff:a.b.c.d. */
export function parseIp(raw: string | null | undefined): Parsed | null {
  if (!raw) return null;
  let s = raw.trim();
  const br = /^\[([^\]]+)\](?::\d+)?$/.exec(s);
  if (br) s = br[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(s)) s = s.slice(0, s.lastIndexOf(":"));
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(s);
  if (mapped) s = mapped[1];
  const v4 = parseV4(s);
  if (v4 !== null) return { v: 4, n: v4 };
  const v6 = parseV6(s);
  return v6 === null ? null : { v: 6, n: v6 };
}

type Range = { v: 4 | 6; base: bigint; bits: number };
function compile(cidrs: readonly string[], v: 4 | 6): Range[] {
  return cidrs.map((c) => {
    const [addr, len] = c.split("/");
    const p = parseIp(addr);
    if (!p || p.v !== v) throw new Error(`bad CIDR ${c}`);
    return { v, base: p.n, bits: Number(len) };
  });
}
const RANGES: Range[] = [...compile(CLOUDFLARE_IPV4, 4), ...compile(CLOUDFLARE_IPV6, 6)];

export function isCloudflareIp(raw: string | null | undefined): boolean {
  const p = parseIp(raw);
  if (!p) return false;
  const width = p.v === 4 ? 32 : 128;
  return RANGES.some((r) => {
    if (r.v !== p.v) return false;
    const shift = BigInt(width - r.bits);
    return p.n >> shift === r.base >> shift;
  });
}

function canonical(raw: string): string {
  const p = parseIp(raw);
  if (!p) return raw.trim();
  if (p.v === 4) return [24, 16, 8, 0].map((s) => String((p.n >> BigInt(s)) & BigInt(255))).join(".");
  return raw.trim().replace(/^\[|\]$/g, "").toLowerCase();
}

/** The address Railway's edge saw as its peer (Cloudflare when proxied). null when no proxy header exists. */
export function connectingHop(get: (name: string) => string | null | undefined): string | null {
  const real = parseIp(get("x-real-ip"));
  if (real) return canonical(get("x-real-ip") as string);
  const xff = (get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  for (let i = xff.length - 1; i >= 0; i--) {
    if (parseIp(xff[i])) return canonical(xff[i]);
    break; // last entry unparsable -> do not fall back to client-supplied earlier entries
  }
  return null;
}

/** Client IP for rate limits and logging. `get` reads a request header (case-insensitive). */
export function clientIpFrom(get: (name: string) => string | null | undefined): string | null {
  const hop = connectingHop(get);
  if (hop && isCloudflareIp(hop)) {
    const cf = get("cf-connecting-ip");
    if (parseIp(cf)) return canonical(cf as string);
  }
  return hop;
}
