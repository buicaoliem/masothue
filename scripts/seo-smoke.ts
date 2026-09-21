export {};
// SEO smoke test: crawls a representative set of routes on a running server and validates
// status, title, description, canonical, robots, H1, internal links, JSON-LD and metadata duplication.
//
//   BASE_URL=http://localhost:3000 npx tsx scripts/seo-smoke.ts
//   BASE_URL=https://www.masothuedn.com npx tsx scripts/seo-smoke.ts
//
// Sample entities (company, industry, legal form...) are discovered from the sitemaps; override with
// SMOKE_COMPANY, SMOKE_INDUSTRY, SMOKE_LEGAL_FORM, SMOKE_PROVINCE, SMOKE_GUIDE.

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const CANONICAL_HOST = "https://www.masothuedn.com";

type Route = {
  label: string;
  path: string;
  status: number;
  /** true = must be indexable, false = must be noindex, undefined = don't care. */
  indexable?: boolean;
  redirectTo?: string;
  minLinks?: number;
  breadcrumb?: boolean;
};

const errors: string[] = [];
const fail = (label: string, msg: string) => errors.push(`[${label}] ${msg}`);

async function get(path: string, redirect: RequestRedirect = "manual") {
  return fetch(`${BASE}${path}`, { redirect, headers: { "user-agent": "seo-smoke/1.0" } });
}

async function firstLocs(sitemapUrl: string, filter: RegExp, n = 1): Promise<string[]> {
  const res = await fetch(sitemapUrl.replace(CANONICAL_HOST, BASE));
  if (!res.ok) return [];
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(CANONICAL_HOST, ""))
    .filter((p) => filter.test(p))
    .slice(0, n);
}

async function discover() {
  const pick = async (section: string, re: RegExp) => (await firstLocs(`${BASE}/sitemaps/${section}.xml`, re))[0];
  return {
    company: process.env.SMOKE_COMPANY ?? (await pick("companies-0", /^\/\d{10}(-\d{3})?$/)),
    industry: process.env.SMOKE_INDUSTRY ?? (await pick("industries", /^\/nganh\//)),
    legalForm: process.env.SMOKE_LEGAL_FORM ?? (await pick("taxonomy", /^\/loai-hinh\//)),
    province: process.env.SMOKE_PROVINCE ?? (await pick("provinces", /^\/tinh\//)),
    guide: process.env.SMOKE_GUIDE ?? (await pick("guides", /^\/huong-dan\//)),
  };
}

const attr = (tag: string, name: string) => new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag)?.[1];

function parse(html: string) {
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim();
  const metas = [...html.matchAll(/<meta\s[^>]*>/gi)].map((m) => m[0]);
  const description = metas.map((m) => (attr(m, "name") === "description" ? attr(m, "content") : undefined)).find(Boolean);
  const robots = metas.map((m) => (attr(m, "name") === "robots" ? attr(m, "content") : undefined)).find(Boolean);
  const canonicals = [...html.matchAll(/<link\s[^>]*rel="canonical"[^>]*>/gi)].map((m) => attr(m[0], "href"));
  const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
  const links = [...html.matchAll(/<a\s[^>]*href="(\/[^"#]*)"/gi)].map((m) => m[1]);
  const jsonld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  return { title, description, robots, canonicals, h1, links, jsonld };
}

function checkJsonLd(label: string, blocks: string[]) {
  const seen = new Set<string>();
  for (const raw of blocks) {
    let data: { "@type"?: string };
    try {
      data = JSON.parse(raw.replace(/\\u003c/g, "<"));
    } catch {
      fail(label, "JSON-LD does not parse");
      continue;
    }
    if (/undefined|"null"/.test(raw)) fail(label, "JSON-LD contains undefined/null");
    const type = String(data["@type"]);
    if (seen.has(type)) fail(label, `duplicate JSON-LD @type ${type}`);
    seen.add(type);
    if (/"(item|url)":"http/.test(raw) && !new RegExp(`"(item|url)":"${CANONICAL_HOST}`).test(raw)) fail(label, "JSON-LD URL is not on the canonical host");
  }
}

async function main() {
  const s = await discover();
  const routes: Route[] = [
    { label: "home", path: "/", status: 200, indexable: true, minLinks: 10 },
    { label: "invalid company", path: "/1234567", status: 404 },
    { label: "search", path: "/tim-kiem?q=abc", status: 200, indexable: false },
    { label: "tool", path: "/cong-cu/tinh-thue-tncn", status: 200, indexable: true, breadcrumb: false },
    { label: "guide", path: s.guide ?? "/huong-dan/ma-so-thue-la-gi", status: 200, indexable: true, breadcrumb: true },
    { label: "unknown taxonomy", path: "/nganh/0-khong-ton-tai", status: 404 },
    { label: "unknown province", path: "/tinh/khong-ton-tai", status: 404 },
    { label: "unknown status", path: "/trang-thai/khong-ton-tai", status: 404 },
  ];
  if (s.company) {
    routes.push({ label: "company", path: s.company, status: 200, indexable: true, minLinks: 3, breadcrumb: true });
    routes.push({ label: "company wrong slug", path: `${s.company}-ten-sai`, status: 301, redirectTo: s.company });
  } else fail("discovery", "no company found in sitemaps (empty database?)");
  if (s.province) routes.push({ label: "province", path: s.province, status: 200, breadcrumb: true });
  if (s.industry) routes.push({ label: "industry", path: s.industry, status: 200, indexable: true, breadcrumb: true });
  if (s.legalForm) routes.push({ label: "legal form", path: s.legalForm, status: 200, indexable: true, breadcrumb: true });
  routes.push({ label: "status", path: "/trang-thai/dang-hoat-dong", status: 200, breadcrumb: true });

  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();

  for (const r of routes) {
    const res = await get(r.path);
    const okStatus = r.redirectTo ? res.status === 301 || res.status === 308 : res.status === r.status;
    if (!okStatus) {
      fail(r.label, `${r.path} -> HTTP ${res.status}, expected ${r.status}`);
      continue;
    }
    if (r.redirectTo) {
      const loc = res.headers.get("location") ?? "";
      if (!loc.endsWith(r.redirectTo)) fail(r.label, `redirects to ${loc}, expected ${r.redirectTo}`);
      continue;
    }
    if (r.status !== 200) continue;

    const p = parse(await res.text());
    if (!p.title) fail(r.label, "missing <title>");
    if (!p.description && r.indexable !== false) fail(r.label, "missing meta description");
    if ((p.description ?? "").length > 200) fail(r.label, "description too long");
    if (p.h1 !== 1) fail(r.label, `expected exactly one <h1>, found ${p.h1}`);
    if (r.minLinks && p.links.length < r.minLinks) fail(r.label, `only ${p.links.length} internal links`);

    const noindex = /noindex/i.test(p.robots ?? "");
    if (r.indexable === true && noindex) fail(r.label, "unexpectedly noindex");
    if (r.indexable === false && !noindex) fail(r.label, "must be noindex");
    if (r.label === "home" && noindex) fail(r.label, "homepage must never be noindex");

    if (r.indexable !== false) {
      if (p.canonicals.length !== 1) fail(r.label, `expected 1 canonical, found ${p.canonicals.length}`);
      else if (!p.canonicals[0]?.startsWith(CANONICAL_HOST)) fail(r.label, `canonical not on ${CANONICAL_HOST}: ${p.canonicals[0]}`);
      else if (p.canonicals[0].includes("?")) fail(r.label, `canonical carries a query: ${p.canonicals[0]}`);
    } else if (p.canonicals.length > 0) fail(r.label, "noindex utility page must not declare a canonical");

    checkJsonLd(r.label, p.jsonld);
    if (r.breadcrumb && !p.jsonld.some((j) => j.includes('"BreadcrumbList"'))) fail(r.label, "missing BreadcrumbList");

    if (p.title && r.indexable !== false) {
      if (titles.has(p.title)) fail(r.label, `duplicate title with ${titles.get(p.title)}`);
      titles.set(p.title, r.label);
    }
    if (p.description && r.indexable !== false) {
      if (descriptions.has(p.description)) fail(r.label, `duplicate description with ${descriptions.get(p.description)}`);
      descriptions.set(p.description, r.label);
    }
  }

  // Query facets and tracking params must not create a different canonical.
  if (s.province) {
    const withParams = parse(await (await get(`${s.province}?utm_source=x&sort=name`)).text());
    if (withParams.canonicals[0] && withParams.canonicals[0].includes("?")) fail("facets", "tracking/facet params leak into canonical");
  }

  const robots = await get("/robots.txt");
  const robotsTxt = await robots.text();
  if (robots.status !== 200) fail("robots.txt", `HTTP ${robots.status}`);
  if (!robotsTxt.includes(`Sitemap: ${CANONICAL_HOST}/sitemap.xml`)) fail("robots.txt", "missing Sitemap declaration");
  if (/^Disallow:\s*\/(tim-kiem|search|_next)/im.test(robotsTxt)) fail("robots.txt", "blocks a route that relies on noindex");

  const sitemap = await get("/sitemap.xml");
  const sitemapXml = await sitemap.text();
  if (sitemap.status !== 200 || !sitemapXml.includes("<sitemapindex")) fail("sitemap.xml", `HTTP ${sitemap.status} or not a sitemap index`);

  console.log(`SEO smoke on ${BASE}: ${routes.length} routes checked + robots.txt + sitemap.xml`);
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
