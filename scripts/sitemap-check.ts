export {};
// Sitemap QA. Reads /sitemap.xml, every child sitemap, and validates:
// structure, per-file 50,000 cap, duplicates (within and across files), host, query strings,
// and (sampled, deterministic) HTTP status + noindex on the listed URLs.
//
//   BASE_URL=http://localhost:3000 npx tsx scripts/sitemap-check.ts
//   SAMPLE=20 BASE_URL=https://www.masothuedn.com npx tsx scripts/sitemap-check.ts
//
// BASE_URL is where requests go; URLs inside the sitemaps must still be on the canonical host.

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const CANONICAL_HOST = "https://www.masothuedn.com";
const MAX_URLS = 50_000;
const SAMPLE = Number(process.env.SAMPLE ?? 10); // URLs fetched per child sitemap

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const local = (url: string) => (url.startsWith(CANONICAL_HOST) ? `${BASE}${url.slice(CANONICAL_HOST.length)}` : url);

/** Deterministic spread: first, last and evenly spaced entries, so reruns check the same URLs. */
function sample<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const out = new Set<T>([items[0], items[items.length - 1]]);
  for (let i = 1; out.size < n; i++) out.add(items[Math.floor((i * items.length) / n) % items.length]);
  return [...out];
}

async function main() {
  const indexRes = await fetch(`${BASE}/sitemap.xml`);
  if (!indexRes.ok) throw new Error(`/sitemap.xml -> HTTP ${indexRes.status}`);
  const indexXml = await indexRes.text();
  if (!indexXml.includes("<sitemapindex")) fail("/sitemap.xml is not a <sitemapindex>");

  const children = locs(indexXml);
  if (new Set(children).size !== children.length) fail("duplicate child sitemaps in the index");
  const seenUrls = new Map<string, string>();
  let total = 0;

  for (const child of children) {
    if (!child.startsWith(`${CANONICAL_HOST}/sitemaps/`)) fail(`child sitemap not on canonical host: ${child}`);
    const res = await fetch(local(child));
    if (!res.ok) {
      fail(`${child} -> HTTP ${res.status}`);
      continue;
    }
    const xml = await res.text();
    if (!xml.includes("<urlset")) fail(`${child} is not a <urlset>`);
    const urls = locs(xml);
    total += urls.length;
    if (urls.length > MAX_URLS) fail(`${child} has ${urls.length} URLs (> ${MAX_URLS})`);
    if (new Set(urls).size !== urls.length) fail(`${child} contains duplicate URLs`);

    for (const u of urls) {
      if (!u.startsWith(`${CANONICAL_HOST}/`) && u !== CANONICAL_HOST) fail(`${child}: wrong host ${u}`);
      if (u.includes("?") || u.includes("#")) fail(`${child}: URL with query/fragment ${u}`);
      if (/\/tim-kiem|\/search/.test(u)) fail(`${child}: search URL listed ${u}`);
      if (u.length > 2048) fail(`${child}: URL too long`);
      const prev = seenUrls.get(u);
      if (prev && prev !== child) fail(`${u} appears in both ${prev} and ${child}`);
      seenUrls.set(u, child);
    }

    for (const u of sample(urls, SAMPLE)) {
      const r = await fetch(local(u), { redirect: "manual" });
      if (r.status !== 200) {
        fail(`${child}: ${u} -> HTTP ${r.status}`);
        continue;
      }
      const html = await r.text();
      if (/<meta[^>]+name="robots"[^>]+noindex/i.test(html)) fail(`${child}: ${u} is in the sitemap but noindex`);
      const canon = /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i.exec(html)?.[1];
      if (canon && canon.replace(/\/$/, "") !== u.replace(/\/$/, "")) fail(`${child}: ${u} canonical is ${canon}`);
    }
    console.log(`${child.replace(CANONICAL_HOST, "")}: ${urls.length} URLs`);
  }

  console.log(`\n${children.length} child sitemaps, ${total} URLs total, sampled ${SAMPLE} per file`);
  if (errors.length) {
    console.error(`\n${errors.length} problem(s):\n${errors.map((e) => ` - ${e}`).join("\n")}`);
    process.exit(1);
  }
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
