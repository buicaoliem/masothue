// HTTP Basic Auth for the (future) directory admin pages.
// Denies everything when ADMIN_USER or ADMIN_PASSWORD is unset. Web Crypto only, so it also runs in middleware.

export const ADMIN_REALM = 'Basic realm="masothue-admin", charset="UTF-8"';

async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

/** Compare digests so neither length nor content leaks through timing. */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** True only when the Authorization header carries the configured admin credentials. */
export async function isAdminAuthorized(authorization: string | null | undefined): Promise<boolean> {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password || !authorization?.startsWith("Basic ")) return false;

  let decoded: string;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(authorization.slice(6).trim()), (c) => c.charCodeAt(0)));
  } catch {
    return false;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  const [userOk, passOk] = await Promise.all([
    safeEqual(decoded.slice(0, sep), user),
    safeEqual(decoded.slice(sep + 1), password),
  ]);
  return userOk && passOk;
}

/** null = let the request through; otherwise the 401 response to return. */
export async function requireAdmin(req: Request): Promise<Response | null> {
  if (await isAdminAuthorized(req.headers.get("authorization"))) return null;
  return new Response("Unauthorized", {
    status: 401,
    headers: { "www-authenticate": ADMIN_REALM, "cache-control": "no-store" },
  });
}
