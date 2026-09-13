// Seeds Company rows (taxCode + PENDING only) from the doanhnghiep.vn sitemap.
// Usage: tsx pipeline/scripts/seed-sitemap.ts <download|extract|load> <workDir>
// Raw sitemap files and the extracted code list live in <workDir> (not the repo).
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_SITEMAP = "https://doanhnghiep.vn/sitemap.xml";
const CRAWL_DELAY_MS = 5_000; // robots.txt Crawl-delay for our user agents
const LOAD_BATCH = 5_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

async function get(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** Walk the sitemap index tree and save every urlset file to <workDir>/raw. */
async function download(workDir: string) {
  const rawDir = path.join(workDir, "raw");
  await mkdir(rawDir, { recursive: true });
  const queue = [ROOT_SITEMAP];
  const leaves: string[] = [];
  let first = true;

  while (queue.length) {
    const url = queue.shift()!;
    const file = path.join(rawDir, new URL(url).pathname.replace(/^\//, "").replace(/\//g, "__"));
    let xml: string;
    const cached = await stat(file).catch(() => null);
    if (cached && cached.size > 0) {
      xml = await readFile(file, "utf8");
    } else {
      if (!first) await sleep(CRAWL_DELAY_MS);
      first = false;
      const t0 = Date.now();
      xml = await get(url);
      await writeFile(file, xml);
      console.log(`fetched ${url} (${(xml.length / 1e6).toFixed(1)} MB, ${Date.now() - t0} ms)`);
    }
    if (xml.includes("<sitemapindex")) queue.push(...locs(xml));
    else leaves.push(url);
  }
  await writeFile(path.join(workDir, "leaves.json"), JSON.stringify(leaves, null, 2));
  console.log(`leaf sitemaps: ${leaves.length}`);
}

/** Extract tax codes from company URLs, filter by format, dedupe. */
async function extract(workDir: string) {
  const leaves: string[] = JSON.parse(await readFile(path.join(workDir, "leaves.json"), "utf8"));
  const rawDir = path.join(workDir, "raw");
  const files = new Set(await readdir(rawDir));
  let urls = 0;
  let candidates = 0;
  const rejected: string[] = [];
  const codes = new Set<string>();

  for (const leaf of leaves) {
    const name = new URL(leaf).pathname.replace(/^\//, "").replace(/\//g, "__");
    if (!files.has(name)) throw new Error(`missing raw file for ${leaf}`);
    for (const loc of locs(await readFile(path.join(rawDir, name), "utf8"))) {
      urls++;
      const m = new URL(loc).pathname.match(/^\/dn\/([^/]+)\/?$/);
      if (!m) continue; // not a company page
      candidates++;
      const raw = decodeURIComponent(m[1]);
      // 10 digits, or 10 digits + 3-digit branch suffix (with or without "-").
      const f = raw.match(/^(\d{10})(?:-?(\d{3}))?$/);
      if (!f) {
        rejected.push(raw);
        continue;
      }
      codes.add(f[2] ? `${f[1]}-${f[2]}` : f[1]);
    }
  }

  const list = [...codes];
  const branch = list.filter((c) => c.includes("-")).length;
  const summary = {
    leafFiles: leaves.length,
    urls,
    codesExtracted: candidates,
    rejectedFormat: rejected.length,
    rejectedSample: rejected.slice(0, 20),
    uniqueValid: list.length,
    tenDigit: list.length - branch,
    thirteenDigit: branch,
  };
  await writeFile(path.join(workDir, "codes.txt"), list.join("\n"));
  await writeFile(path.join(workDir, "extract-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

/** Insert bare PENDING rows; existing rows (possibly enriched) are left untouched. */
async function load(workDir: string) {
  const { prisma } = await import("../db");
  try {
    const codes = (await readFile(path.join(workDir, "codes.txt"), "utf8")).split("\n").filter(Boolean);
    const before = await prisma.company.count();
    let inserted = 0;
    const t0 = Date.now();
    for (let i = 0; i < codes.length; i += LOAD_BATCH) {
      const batch = codes.slice(i, i + LOAD_BATCH);
      const r = await prisma.company.createMany({
        data: batch.map((taxCode) => ({ taxCode, enrichStatus: "PENDING" as const })),
        skipDuplicates: true,
      });
      inserted += r.count;
      if ((i / LOAD_BATCH) % 40 === 0) {
        console.log(`${i + batch.length}/${codes.length} processed, ${inserted} inserted`);
      }
    }
    const after = await prisma.company.count();
    const pending = await prisma.company.count({ where: { enrichStatus: "PENDING" } });
    console.log(JSON.stringify({ codes: codes.length, inserted, before, after, pending, ms: Date.now() - t0 }));
  } finally {
    await prisma.$disconnect();
  }
}

const [mode, workDir] = process.argv.slice(2);
const run = { download, extract, load }[mode as "download" | "extract" | "load"];
if (!run || !workDir) {
  console.error("usage: seed-sitemap.ts <download|extract|load> <workDir>");
  process.exit(1);
}
run(workDir).catch((err) => {
  console.error(err instanceof Error ? err.message : "seed failed");
  process.exitCode = 1;
});
