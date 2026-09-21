import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "@/lib/directory/sql";
import { integrityProblems, measureCoverage } from "@/lib/industry/coverage";
import { normalizeCodeSet } from "@/lib/industry/normalize";
import { emptyIndustryStats, persistIndustries, rebuildIndustryCatalog } from "@/lib/industry/persist";
import { unionIndustries } from "@/lib/industry/service";
import { emptySetStats, loadCatalogCodes, persistIndustrySets, unionCodes } from "@/lib/industry/set";
import { rebuildIndustryStats } from "@/lib/industry/stats";
import { runIndustryImport } from "./industry-source";

// Compact registered-industry sets (HCM), unified union and derived stats. Real migrations replayed into PGlite.
const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
const pgliteSql = (db: PGlite): Sql => {
  const wrap = (c: Pick<PGlite, "query">): Sql => ({
    query: async <T>(text: string, params: unknown[] = []) => (await c.query<T>(text, params)).rows,
    transaction: (fn) => fn(wrap(c)),
  });
  return { ...wrap(db), transaction: (fn) => db.transaction((tx) => fn(wrap(tx))) };
};

let db: PGlite;
let sql: Sql;
beforeEach(async () => {
  db = new PGlite();
  for (const d of readdirSync(MIGRATIONS).filter((x) => /^\d/.test(x)).sort()) await db.exec(readFileSync(join(MIGRATIONS, d, "migration.sql"), "utf8"));
  sql = pgliteSql(db);
});

async function seed(taxCode: string, cols: Record<string, unknown> = {}) {
  const all = { id: `c-${taxCode}`, taxCode, name: "CTY", address: "HN", enrichStatus: "OK", updatedAt: new Date(), ...cols };
  const keys = Object.keys(all);
  await db.query(`INSERT INTO "Company" (${keys.map((k) => `"${k}"`).join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")})`, Object.values(all));
}
const company = async (taxCode: string) => (await db.query<Record<string, unknown>>(`SELECT * FROM "Company" WHERE "taxCode" = $1`, [taxCode])).rows[0];
const sets = async (taxCode: string) =>
  (await db.query<{ codes: string[]; source: string }>(
    `SELECT s.codes, s.source FROM "CompanyIndustrySet" s JOIN "Company" c ON c.id = s."companyId" WHERE c."taxCode" = $1`,
    [taxCode],
  )).rows;

const A = "0100109106";
const B = "0300588569";
const C = "0100100079";
const ind = (code: string, name = `Ngành ${code}`) => ({ code, name });
const HCM = { source: "opendata-hcm", sourceUpdatedAt: "2025-11-14" };

async function runSet(inputs: { taxCode: string; entries: { code: string; name: string }[] }[], apply = true) {
  const stats = emptySetStats();
  await persistIndustrySets(sql, inputs, HCM, { apply, stats, knownCodes: await loadCatalogCodes(sql) });
  return stats;
}
async function runRows(inputs: Parameters<typeof persistIndustries>[1]) {
  const stats = emptyIndustryStats();
  await persistIndustries(sql, inputs, { source: "opendata-sonla", sourceUpdatedAt: "2024-11-25" }, { apply: true, stats });
  return stats;
}

test("compact set: codes are normalized, de-duplicated and sorted; names are not stored", async () => {
  await seed(A);
  await runSet([{ taxCode: A, entries: [ind("4669"), ind("1621"), ind("4669", "dup"), { code: "bad", name: "x" }, ind("0210")] }]);
  const [row] = await sets(A);
  assert.deepEqual(row.codes, ["0210", "1621", "4669"]);
  assert.equal(row.source, "opendata-hcm");
  const cols = (await db.query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_name = 'CompanyIndustrySet'`)).rows.map((r) => r.column_name);
  assert.ok(!cols.includes("name"), "no repeated names in the compact table");
  assert.deepEqual(normalizeCodeSet(["6201", 6201, "06201x", " 4669 ", "4669"]), ["4669", "6201"]);
});

test("compact set: idempotent, union-only growth, never shrinks, one row per company and source", async () => {
  await seed(A);
  const first = await runSet([{ taxCode: A, entries: [ind("4669"), ind("1621")] }]);
  assert.equal(first.rowsInserted, 1);
  const again = await runSet([{ taxCode: A, entries: [ind("4669"), ind("1621")] }]);
  assert.equal(again.rowsInserted + again.rowsUpdated, 0);
  assert.equal(again.rowsUnchanged, 1);
  const grown = await runSet([{ taxCode: A, entries: [ind("7110")] }]);
  assert.equal(grown.rowsUpdated, 1);
  assert.deepEqual((await sets(A))[0].codes, ["1621", "4669", "7110"]);
  assert.equal((await sets(A)).length, 1);
  assert.deepEqual(unionCodes(["0001", "0022"], ["0022", "0003"]), ["0001", "0003", "0022"]);
});

test("compact set: empty list creates no record; hidden/pending/unknown companies are skipped", async () => {
  await seed(A);
  await seed(B, { isHidden: true });
  await seed(C, { enrichStatus: "PENDING", name: null, address: null });
  const stats = await runSet([
    { taxCode: A, entries: [] },
    { taxCode: B, entries: [ind("4669")] },
    { taxCode: C, entries: [ind("4669")] },
    { taxCode: "0100100417", entries: [ind("4669")] },
  ]);
  assert.equal(stats.rowsInserted, 0);
  assert.equal(stats.skippedHiddenOrRemoval, 1);
  assert.equal(stats.skippedNotListable, 1);
  assert.equal(stats.companyNotFound, 1);
  assert.equal((await db.query(`SELECT 1 FROM "CompanyIndustrySet"`)).rows.length, 0);
});

test("compact set: HCM never creates a primary and never touches Company.mainIndustry", async () => {
  await seed(A);
  await seed(B, { mainIndustry: "6201 - Lập trình" });
  await runSet([
    { taxCode: A, entries: [ind("4669"), ind("1621")] },
    { taxCode: B, entries: [ind("4669")] },
  ]);
  assert.equal((await company(A)).mainIndustry, null, "first registered industry must not become the primary");
  assert.equal((await company(B)).mainIndustry, "6201 - Lập trình");
  assert.equal((await db.query(`SELECT 1 FROM "CompanyIndustry"`)).rows.length, 0, "no join rows are written");
  assert.ok((await company(A)).dataUpdatedAt, "content change bumps dataUpdatedAt");
});

test("compact set: new codes join the catalog with their first-seen name, existing names are kept", async () => {
  await seed(A);
  await runSet([{ taxCode: A, entries: [ind("4669", "Bán buôn chuyên doanh khác")] }]);
  await seed(B);
  await runSet([{ taxCode: B, entries: [ind("4669", "Tên khác")] }]);
  const names = (await db.query<{ name: string }>(`SELECT name FROM "IndustryCatalog" WHERE code = '4669'`)).rows;
  assert.deepEqual(names, [{ name: "Bán buôn chuyên doanh khác" }]);
});

test("explicit primary from another source keeps its semantics next to an HCM set", async () => {
  await seed(A);
  await runRows([{ taxCode: A, primary: ind("6201"), others: [] }]);
  await runSet([{ taxCode: A, entries: [ind("6201"), ind("4669")] }]);
  const u = unionIndustries([
    { code: "6201", name: "A", isPrimary: true, source: "opendata-sonla" },
    { code: "6201", name: "A", isPrimary: false, source: "opendata-hcm" },
    { code: "4669", name: "B", isPrimary: false, source: "opendata-hcm" },
  ]);
  assert.equal(u.primary?.code, "6201");
  assert.deepEqual(u.registered.map((r) => r.code), ["4669"], "a code that is primary anywhere is not repeated as registered");
  assert.deepEqual(u.sources, ["opendata-hcm", "opendata-sonla"]);
  assert.equal((await company(A)).mainIndustry, "6201 - Ngành 6201", "existing primary and cache are untouched");
});

test("unified union: row-only, set-only, both, and no data", () => {
  assert.deepEqual(unionIndustries([]), { primary: null, registered: [], sources: [] });
  const setOnly = unionIndustries([
    { code: "4669", name: "4669", isPrimary: false, source: "opendata-hcm" },
    { code: "1621", name: "Gỗ", isPrimary: false, source: "opendata-hcm" },
  ]);
  assert.equal(setOnly.primary, null, "a registered list never yields a primary");
  assert.deepEqual(setOnly.registered.map((r) => r.code), ["1621", "4669"]);
  const rowOnly = unionIndustries([{ code: "6201", name: "A", isPrimary: true, source: null }]);
  assert.equal(rowOnly.primary?.name, "A");
  assert.deepEqual(rowOnly.registered, []);
});

test("stats rebuild: unions both storages, splits primary vs registered, idempotent, drops stale rows", async () => {
  await seed(A, { provinceSlug: "quang-ngai" });
  await seed(B, { provinceSlug: "ho-chi-minh" });
  await seed(C, { provinceSlug: "ho-chi-minh" });
  await runRows([{ taxCode: A, primary: ind("6201"), others: [ind("4669")] }]);
  await runSet([
    { taxCode: B, entries: [ind("4669"), ind("6201")] },
    { taxCode: C, entries: [ind("4669")] },
    { taxCode: A, entries: [ind("4669")] }, // same code in both storages: counted once
  ]);
  await rebuildIndustryCatalog(sql);
  const r1 = await rebuildIndustryStats(sql, { apply: true, now: new Date("2026-01-01T00:00:00Z") });
  const stat = async () =>
    (await db.query<Record<string, unknown>>(`SELECT code, "companyCount", "primaryCount", "registeredCount", "provinceCount", "sourceCount" FROM "IndustryStat" ORDER BY code`)).rows;
  const first = await stat();
  assert.deepEqual(first, [
    { code: "4669", companyCount: 3, primaryCount: 0, registeredCount: 3, provinceCount: 2, sourceCount: 2 },
    { code: "6201", companyCount: 2, primaryCount: 1, registeredCount: 1, provinceCount: 2, sourceCount: 2 },
  ]);
  const pair = (await db.query<Record<string, number>>(
    `SELECT "companyCount", "provinceIndustryCompanyCount", "saturationRatio" FROM "ProvinceIndustryStat" WHERE "provinceSlug" = 'ho-chi-minh' AND code = '4669'`,
  )).rows[0];
  assert.equal(pair.companyCount, 2);
  assert.equal(pair.provinceIndustryCompanyCount, 2);
  assert.equal(pair.saturationRatio, 1);
  assert.equal(r1.staleIndustryRows, 0);

  const r2 = await rebuildIndustryStats(sql, { apply: true, now: new Date("2026-01-02T00:00:00Z") });
  assert.deepEqual(await stat(), first, "same data, same aggregates");
  assert.equal(r2.industryRows, 2);

  await db.query(`DELETE FROM "CompanyIndustrySet" WHERE codes = ARRAY['4669','6201']`);
  const r3 = await rebuildIndustryStats(sql, { apply: true, now: new Date("2026-01-03T00:00:00Z") });
  assert.ok(r3.staleProvinceIndustryRows >= 1);
  const dry = await rebuildIndustryStats(sql, { apply: false });
  assert.equal(dry.staleIndustryRows, 0);
});

test("stats: hidden companies and codes missing from the catalog never produce aggregates", async () => {
  await seed(A, { provinceSlug: "ha-noi" });
  await seed(B, { provinceSlug: "ha-noi", isHidden: true });
  await runRows([{ taxCode: A, primary: ind("6201"), others: [] }]);
  await db.query(`INSERT INTO "CompanyIndustrySet" ("companyId", source, codes, "updatedAt") VALUES ($1, 'x', ARRAY['9999'], now())`, ["c-" + B]);
  await rebuildIndustryCatalog(sql);
  await rebuildIndustryStats(sql);
  const codes = (await db.query<{ code: string }>(`SELECT code FROM "IndustryStat" ORDER BY code`)).rows.map((r) => r.code);
  assert.deepEqual(codes, ["6201"]);
});

test("coverage: compact sets are measured; duplicates/unknown codes are integrity errors, registered-without-primary is not", async () => {
  await seed(A);
  await runSet([{ taxCode: A, entries: [ind("4669"), ind("1621")] }]);
  let c = await measureCoverage(sql);
  assert.equal(c.companiesWithCompactSet, 1);
  assert.equal(c.compactMemberships, 2);
  assert.equal(c.avgIndustriesPerCompany, 2);
  assert.equal(c.maxIndustriesPerCompany, 2);
  assert.equal(c.withAnyIndustry, 1);
  assert.equal(c.withPrimaryIndustry, 0);
  assert.equal(c.registeredWithoutPrimary, 1);
  assert.deepEqual(integrityProblems(c).filter((p) => /primary/.test(p)), [], "no primary is expected for HCM");
  await db.query(`UPDATE "CompanyIndustrySet" SET codes = ARRAY['4669','4669','zz']`);
  await db.query(`DELETE FROM "IndustryCatalog"`);
  c = await measureCoverage(sql);
  assert.equal(c.duplicateCodesInArrays, 1);
  assert.equal(c.malformedCodesInArrays, 1);
  assert.ok(c.unknownIndustryCodes >= 1);
  assert.ok(integrityProblems(c).length >= 3);
});

test("hcm import run: compact rows only, no primary, idempotent, resumable, dry run writes nothing", async () => {
  await seed(A);
  await seed(B);
  const header = ["MaSoDN", "TenDN", "NganhNghe"];
  const rows = [
    [A, "X", "1621: Gỗ-(x);4669: Bán buôn khác;4669: Bán buôn khác"],
    [B, "Y", "4669: Bán buôn khác"],
    ["bad", "Z", "4669: Bán buôn khác"],
  ];
  const r = await runIndustryImport(sql, "hcm", header, rows, { apply: true, limit: 1000 });
  assert.equal(r.mode, "set");
  assert.equal(r.setStats.rowsInserted, 2);
  assert.equal(r.setStats.memberships, 3);
  assert.equal(r.counters.duplicateEntries, 1);
  assert.equal(r.invalidOrEmpty, 1);
  assert.equal((await db.query(`SELECT 1 FROM "CompanyIndustry"`)).rows.length, 0);
  const again = await runIndustryImport(sql, "hcm", header, rows, { apply: true, limit: 1000, offset: 0 });
  assert.equal(again.setStats.rowsInserted + again.setStats.rowsUpdated, 0);
  const resumed = await runIndustryImport(sql, "hcm", header, rows, { apply: true, limit: 1000 });
  assert.equal(resumed.start, rows.length);
  await db.query(`DELETE FROM "CompanyIndustrySet"`);
  const dry = await runIndustryImport(sql, "hcm", header, rows, { apply: false, limit: 1000, offset: 0 });
  assert.equal(dry.setStats.rowsInserted, 2);
  assert.equal((await db.query(`SELECT 1 FROM "CompanyIndustrySet"`)).rows.length, 0);
});
