export {};
// Response-time benchmark for representative routes (default: production). No framework: fetch + timers.
//   npm run perf:production
//   BASE_URL=http://localhost:3123 RUNS=7 npm run perf:production
// Per route: the first request (cold-ish: may hit a cold function/connection) is reported separately, then
// RUNS warm requests -> min / median / p90-ish / max for TTFB (headers) and total (body). Sitemaps are used to
// pick real company / industry / province x industry URLs; override with PERF_COMPANIES="0313602877,4300340491" (leading slash optional).

const BASE = (process.env.BASE_URL ?? "https://www.masothuedn.com").replace(/\/+$/, "");
const RUNS = Number(process.env.RUNS ?? 7);

async function locs(sitemap: string): Promise<string[]> {
  const r = await fetch(`${BASE}/sitemaps/${sitemap}`);
  return [...(await r.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace("https://www.masothuedn.com", ""));
}

type Sample = { ttfb: number; total: number; status: number; region: string };

async function once(path: string): Promise<Sample> {
  const t0 = performance.now();
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", headers: { "user-agent": "perf-production/1.0" } });
  const ttfb = performance.now() - t0;
  await res.arrayBuffer();
  const total = performance.now() - t0;
  const id = res.headers.get("x-vercel-id") ?? "";
  return { ttfb, total, status: res.status, region: id.split("::").slice(0, -1).join("->") };
}

const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};
const ms = (n: number) => `${Math.round(n)}`.padStart(5);

async function bench(label: string, path: string) {
  const first = await once(path);
  const warm: Sample[] = [];
  for (let i = 0; i < RUNS; i++) warm.push(await once(path));
  const t = warm.map((w) => w.ttfb);
  const tot = warm.map((w) => w.total);
  const bad = [first, ...warm].filter((s) => s.status >= 500).length;
  console.log(
    `${label.padEnd(24)} first ${ms(first.ttfb)} | ttfb min ${ms(Math.min(...t))} med ${ms(q(t, 50))} p90 ${ms(q(t, 90))} max ${ms(Math.max(...t))} | total med ${ms(q(tot, 50))} | ${first.status}${bad ? ` (${bad} x 5xx!)` : ""} ${first.region}  ${path}`,
  );
  return { label, ttfbMedian: q(t, 50), totalMedian: q(tot, 50) };
}

async function main() {
  console.log(`perf on ${BASE}  (${RUNS} warm runs per route, ms)`);
  const [industries, pairs, companies0] = await Promise.all([locs("industries.xml"), locs("province-industries-0.xml"), locs("companies-0.xml")]);
  const companies = process.env.PERF_COMPANIES
    ? process.env.PERF_COMPANIES.split(",").map((c) => (c.startsWith("/") ? c : `/${c}`))
    : ["/0313602877", companies0[Math.floor(companies0.length / 3)], companies0[Math.floor((2 * companies0.length) / 3)]];
  const pick = (xs: string[], i: number) => xs[Math.floor((xs.length * i) / 3)] ?? xs[0];
  const routes: [string, string][] = [
    ["static /cong-cu (baseline)", "/cong-cu/tinh-thue-tncn"],
    ["homepage", "/"],
    ...companies.map((c, i) => [`company #${i + 1}`, c] as [string, string]),
    ["industry #1", pick(industries, 1)],
    ["industry #2", pick(industries, 2)],
    ["province-industry #1", pick(pairs, 1)],
    ["province-industry #2", pick(pairs, 2)],
    ["province hub HCM", "/tinh/ho-chi-minh"],
  ];
  for (const [label, path] of routes) await bench(label, path);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
