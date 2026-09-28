#!/usr/bin/env node
/**
 * IndexNow submitter — pings search engines when production pages are added,
 * changed, or removed. Never submits the whole site on every deploy: it diffs
 * the current sitemap against the last known snapshot and only sends the delta.
 *
 *   npm run indexnow                  # diff sitemap.xml vs last run, submit delta
 *   npm run indexnow -- --dry-run     # same, but only print what would be sent
 *   npm run indexnow -- --all         # bypass the diff, submit every sitemap URL
 *   npm run indexnow -- --urls=https://ORIGIN/a,https://ORIGIN/b
 *
 * Env:  SITEMAP_URL=https://ORIGIN/sitemap.xml (override for local testing)
 *       STATE_FILE=.indexnow-state.json (override state snapshot location)
 *
 * Note: masothuedn.com serves sitemap.xml as a SITEMAP INDEX (app/sitemaps/[file]/route.ts)
 * rather than a single urlset — fetchSitemap follows one level of <sitemap><loc> entries
 * and merges their <url> entries.
 *
 * Exit code is always 0 unless the script itself is misconfigured (no key
 * file found, no URLs to submit while --urls was malformed, etc). A failure
 * or timeout from the IndexNow API is logged but never fails the run.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const ORIGIN = "https://masothuedn.com"; // <-- set per repo
const ENDPOINT = "https://api.indexnow.org/IndexNow";
const PUBLIC_DIR = path.join(ROOT, "public");
const STATE_FILE = path.join(ROOT, process.env.STATE_FILE || ".indexnow-state.json");
const MAX_URLS_PER_SUBMIT = 10000; // IndexNow API limit

const KEY_FILE_RE = /^[a-f0-9]{32}\.txt$/i;

function parseArgs(argv) {
  const args = { dryRun: false, all: false, urls: null, sitemapUrl: process.env.SITEMAP_URL || `${ORIGIN}/sitemap.xml` };
  for (const raw of argv) {
    if (raw === "--dry-run") args.dryRun = true;
    else if (raw === "--all") args.all = true;
    else if (raw.startsWith("--urls=")) args.urls = raw.slice(7).split(",").map((s) => s.trim()).filter(Boolean);
    else if (raw.startsWith("--sitemap=")) args.sitemapUrl = raw.slice(10);
  }
  return args;
}

export function findKeyFile(dir = PUBLIC_DIR) {
  const candidates = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => KEY_FILE_RE.test(f)) : [];
  if (candidates.length === 0) throw new Error(`Không tìm thấy key file IndexNow trong ${dir} (cần public/<32-hex>.txt).`);
  if (candidates.length > 1) throw new Error(`Có nhiều key file IndexNow trong ${dir}: ${candidates.join(", ")}. Chỉ được có 1.`);
  const file = candidates[0];
  const key = path.basename(file, ".txt").toLowerCase();
  const content = fs.readFileSync(path.join(dir, file), "utf8").trim();
  if (content.toLowerCase() !== key) throw new Error(`Nội dung ${file} ("${content}") không khớp tên file ("${key}").`);
  return { key, keyLocation: `${ORIGIN}/${file}` };
}

const BLOCKED_PATH_RE = /^\/(api|admin|auth|preview|login|staging)(\/|$)/i;

export function isSubmittableUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { return false; }
  if (u.origin !== ORIGIN) return false;
  if (u.search || u.hash) return false;
  if (u.hostname.endsWith(".vercel.app")) return false;
  if (u.pathname.endsWith("/") && u.pathname !== "/") return false;
  if (BLOCKED_PATH_RE.test(u.pathname)) return false;
  if (/\.(xml|txt|json|png|jpg|jpeg|svg|webp|ico|css|js|map)$/i.test(u.pathname)) return false;
  return true;
}

export function dedupeUrls(urls) { return [...new Set(urls)]; }

export function parseSitemap(xml) {
  const entries = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (m[1].match(/<loc>([\s\S]*?)<\/loc>/) || [])[1]?.trim();
    const lastmod = (m[1].match(/<lastmod>([\s\S]*?)<\/lastmod>/) || [])[1]?.trim();
    if (loc) entries.push({ loc, lastmod: lastmod || null });
  }
  return entries;
}

/** Returns the <sitemap><loc>...</loc></sitemap> entries of a sitemap index, or [] if not an index. */
export function parseSitemapIndex(xml) {
  const locs = [];
  for (const m of xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)) {
    const loc = (m[1].match(/<loc>([\s\S]*?)<\/loc>/) || [])[1]?.trim();
    if (loc) locs.push(loc);
  }
  return locs;
}

async function fetchSitemap(sitemapUrl) {
  const res = await fetch(sitemapUrl);
  if (!res.ok) throw new Error(`Fetch sitemap thất bại: ${sitemapUrl} → HTTP ${res.status}`);
  const xml = await res.text();

  const childLocs = parseSitemapIndex(xml);
  if (childLocs.length === 0) {
    // Plain urlset.
    return parseSitemap(xml);
  }

  // Sitemap index: follow one level and merge child <url> entries.
  const entries = [];
  for (const childUrl of childLocs) {
    const childRes = await fetch(childUrl);
    if (!childRes.ok) {
      console.error(`Fetch child sitemap thất bại: ${childUrl} → HTTP ${childRes.status}. Bỏ qua.`);
      continue;
    }
    entries.push(...parseSitemap(await childRes.text()));
  }
  return entries;
}

export function loadState(file = STATE_FILE) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return { urls: {} }; }
}
export function saveState(state, file = STATE_FILE) {
  fs.writeFileSync(file, JSON.stringify(state, null, 2) + "\n");
}

export function diffUrls(current, previousUrls) {
  const added = [], changed = [], removed = [];
  const currentMap = new Map(current.map((e) => [e.loc, e.lastmod]));
  for (const [loc, lastmod] of currentMap) {
    if (!(loc in previousUrls)) added.push(loc);
    else if (previousUrls[loc] !== lastmod) changed.push(loc);
  }
  for (const loc of Object.keys(previousUrls)) if (!currentMap.has(loc)) removed.push(loc);
  return { added, changed, removed };
}

async function submit({ key, keyLocation, urls }) {
  const body = JSON.stringify({ host: new URL(ORIGIN).host, key, keyLocation, urlList: urls });
  const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body });
  const text = await res.text().catch(() => "");
  return { status: res.status, ok: res.ok, body: text };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { key, keyLocation } = findKeyFile();
  let urlsToSubmit, nextState = null;

  if (args.urls) {
    const invalid = args.urls.filter((u) => !isSubmittableUrl(u));
    if (invalid.length) throw new Error(`URL không hợp lệ để submit IndexNow: ${invalid.join(", ")}`);
    urlsToSubmit = dedupeUrls(args.urls);
  } else {
    const sitemapEntries = (await fetchSitemap(args.sitemapUrl)).filter((e) => isSubmittableUrl(e.loc));
    const state = loadState();
    const { added, changed, removed } = diffUrls(sitemapEntries, state.urls);
    nextState = { urls: Object.fromEntries(sitemapEntries.map((e) => [e.loc, e.lastmod])) };
    urlsToSubmit = args.all ? dedupeUrls(sitemapEntries.map((e) => e.loc)) : dedupeUrls([...added, ...changed, ...removed]);
    console.log(`Sitemap: ${sitemapEntries.length} URL. mới: ${added.length}, cập nhật: ${changed.length}, đã gỡ: ${removed.length}.`);
  }

  if (urlsToSubmit.length > MAX_URLS_PER_SUBMIT) {
    console.log(`Danh sách ${urlsToSubmit.length} URL vượt giới hạn ${MAX_URLS_PER_SUBMIT}/lần của IndexNow. Chỉ gửi ${MAX_URLS_PER_SUBMIT} URL đầu tiên.`);
    urlsToSubmit = urlsToSubmit.slice(0, MAX_URLS_PER_SUBMIT);
  }

  console.log(`Chuẩn bị submit ${urlsToSubmit.length} URL tới IndexNow.`);
  if (urlsToSubmit.length === 0) { console.log("Không có gì để submit."); if (nextState) saveState(nextState); return; }
  for (const u of urlsToSubmit) console.log(`  · ${u}`);

  if (args.dryRun) { console.log("(--dry-run) Không gọi IndexNow API, không lưu state."); return; }

  try {
    const result = await submit({ key, keyLocation, urls: urlsToSubmit });
    console.log(`IndexNow response: HTTP ${result.status}${result.body ? ` — ${result.body}` : ""}`);
    if (!result.ok) console.error(`IndexNow trả lỗi (HTTP ${result.status}). Không làm fail deployment.`);
    else if (nextState) saveState(nextState);
  } catch (e) {
    console.error(`Gọi IndexNow API thất bại: ${e.message}. Không làm fail deployment.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`indexnow.mjs: ${e.message}`); process.exitCode = 1; });
}
