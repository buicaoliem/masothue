import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { clientIpFrom } from "@/lib/client-ip";

// Anti-spam helpers shared by the directory forms.

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const DEV_SALT = "dev-only-ip-salt";

let warnedSalt = false;
let warnedTurnstile = false;

/**
 * Client IP from a header getter (Railway / Cloudflare rule: see lib/client-ip.ts).
 * `x-vercel-forwarded-for` (set by Vercel itself, not attacker-controlled there) wins only when running ON Vercel
 * (`VERCEL` env var, dual-run period): on Railway any client can send that header, so it is ignored there.
 */
export function resolveClientIp(get: (name: string) => string | null | undefined, onVercel: boolean): string | null {
  if (onVercel) {
    const vercelForwarded = get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
    if (vercelForwarded) return vercelForwarded;
  }
  return clientIpFrom(get);
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return resolveClientIp((n) => h.get(n), Boolean(process.env.VERCEL));
}

/** Salted SHA-256 of the client IP; the raw IP is never stored. */
export function hashIp(ip: string | null | undefined): string {
  let salt = process.env.IP_HASH_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === "production") throw new Error("IP_HASH_SALT is not set");
    if (!warnedSalt) console.warn("[directory] IP_HASH_SALT is not set; using a development salt");
    warnedSalt = true;
    salt = DEV_SALT;
  }
  return createHash("sha256").update(`${salt}:${ip?.trim() || "unknown"}`).digest("hex");
}

/** Cloudflare Turnstile check. Skipped (true, with one warning) while TURNSTILE_SECRET_KEY is unset. */
export async function verifyTurnstile(token: string | null | undefined, ip: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (!warnedTurnstile) console.warn("[directory] TURNSTILE_SECRET_KEY is not set; skipping Turnstile verification");
    warnedTurnstile = true;
    return true;
  }
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(8_000) });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[directory] Turnstile verification failed", err);
    return false;
  }
}
