import { SITE_URL } from "@/lib/site";

/** Drop public page/sitemap caches after a data write. No-op when no secret is configured. */
export async function purgePublicPageCache(): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.log("page cache: skip purge (set REVALIDATE_SECRET)");
    return;
  }
  const url = process.env.REVALIDATE_URL || `${SITE_URL}/api/revalidate`;
  try {
    const res = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
    console.log(res.ok ? "page cache: purged" : `page cache: purge failed ${res.status}`);
  } catch (err) {
    console.log(`page cache: purge failed (${err instanceof Error ? err.message : "network"})`);
  }
}
