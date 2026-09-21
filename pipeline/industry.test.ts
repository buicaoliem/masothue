import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "@/lib/directory/sql";
import { integrityProblems, measureCoverage } from "@/lib/industry/coverage";
import { emptyIndustryStats, persistIndustries, rebuildIndustryCatalog, reconcileMainIndustry } from "@/lib/industry/persist";
import { isTaxonomyPageIndexable } from "@/lib/seo/indexability";
import { makeIndustryMapper, runIndustryImport } from "./industry-source";

// Real migrations replayed into PGlite, same harness as pipeline/opendata.test.ts.
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
const industries = async (taxCode: string) =>
  (await db.query<{ code: string; isPrimary: boolean; source: string | null }>(
    `SELECT ci.code, ci."isPrimary", ci.source FROM "CompanyIndustry" ci JOIN "Company" c ON c.id = ci."companyId" WHERE c."taxCode" = $1 ORDER BY ci.code`,
    [taxCode],
  )).rows;
const company = async (taxCode: string) => (await db.query<Record<string, unknown>>(`SELECT * FROM "Company" WHERE "taxCode" = $1`, [taxCode])).rows[0];

const A = "0100109106";
const B = "0300588569";
const PROV = { source: "opendata-test", sourceUpdatedAt: "2025-01-01" };
const run = (inputs: Parameters<typeof persistIndustries>[1], apply = true) => {
  const stats = emptyIndustryStats();
  return persistIndustries(sql, inputs, PROV, { apply, stats }).then(() => stats);
};
const ind = (code: string, name = `Ngành ${code}`) => ({ code, name });

test("persist is idempotent: a second run inserts nothing and creates no duplicates", async () => {
  await seed(A);
  const input = [{ taxCode: A, primary: ind("6201"), others: [ind("6202"), ind("6203")] }];
  const first = await run(input);
  assert.equal(first.primaryInserted, 1);
  assert.equal(first.otherInserted, 2);
  const second = await run(input);
  assert.equal(second.primaryInserted + second.otherInserted, 0);
  assert.deepEqual((await industries(A)).map((r) => r.code), ["6201", "6202", "6203"]);
  const c = await company(A);
  assert.equal(c.mainIndustry, "6201 - Ngành 6201");
  assert.ok(c.dataUpdatedAt, "content change bumps dataUpdatedAt");
});

test("dry run writes nothing but reports what it would do", async () => {
  await seed(A);
  const stats = await run([{ taxCode: A, primary: ind("6201"), others: [] }], false);
  assert.equal(stats.primaryInserted, 1);
  assert.equal((await industries(A)).length, 0);
  assert.equal((await company(A)).mainIndustry, null);
});

test("duplicate input rows for one company merge into one set of rows", async () => {
  await seed(A);
  await run([
    { taxCode: A, primary: ind("6201"), others: [ind("6202")] },
    { taxCode: A, primary: null, others: [ind("6202"), ind("6203")] },
  ]);
  assert.deepEqual((await industries(A)).map((r) => r.code), ["6201", "6202", "6203"]);
});

test("at most one primary per company: the database itself enforces it", async () => {
  await seed(A);
  await run([{ taxCode: A, primary: ind("6201"), others: [] }]);
  await assert.rejects(
    db.query(`INSERT INTO "CompanyIndustry" (id, "companyId", code, name, "isPrimary", "updatedAt") VALUES ('x', $1, '6299', 'X', true, now())`, ["c-" + A]),
  );
  // ...and a duplicate (company, code) is rejected too.
  await assert.rejects(
    db.query(`INSERT INTO "CompanyIndustry" (id, "companyId", code, name, "isPrimary", "updatedAt") VALUES ('y', $1, '6201', 'X', false, now())`, ["c-" + A]),
  );
});

test("conflicting primary from another source never replaces the existing one", async () => {
  await seed(A);
  await run([{ taxCode: A, primary: ind("6201"), others: [] }]);
  const stats = await run([{ taxCode: A, primary: ind("9999"), others: [] }]);
  assert.equal(stats.primaryConflicts, 1);
  const rows = await industries(A);
  assert.deepEqual(rows.filter((r) => r.isPrimary).map((r) => r.code), ["6201"]);
  assert.ok(rows.some((r) => r.code === "9999" && !r.isPrimary));
  assert.equal((await company(A)).mainIndustry, "6201 - Ngành 6201");
});

test("existing mainIndustry is never overwritten by an import; legacy value becomes the primary row", async () => {
  await seed(A, { mainIndustry: "6201 - Lập trình" });
  await run([{ taxCode: A, primary: ind("6201", "Lập trình"), others: [] }]);
  assert.deepEqual((await industries(A)).filter((r) => r.isPrimary).map((r) => r.code), ["6201"]);
  assert.equal((await company(A)).mainIndustry, "6201 - Lập trình");
});

test("reconcile: mainIndustry cache is rewritten to match the primary row (source of truth)", async () => {
  await seed(A, { mainIndustry: "6201 - Ngành 6201" });
  await run([{ taxCode: A, primary: ind("6201"), others: [] }]);
  await db.query(`UPDATE "Company" SET "mainIndustry" = '4661 - Sai' WHERE "taxCode" = $1`, [A]);
  assert.ok((await measureCoverage(sql)).mainIndustryCacheMismatch === 1);
  assert.equal(await reconcileMainIndustry(sql), 1);
  assert.equal((await company(A)).mainIndustry, "6201 - Ngành 6201");
  assert.equal((await measureCoverage(sql)).mainIndustryCacheMismatch, 0);
});

test("hidden, removal-requested, unknown and not-yet-enriched companies get no industries", async () => {
  await seed(A, { isHidden: true });
  await seed(B, { enrichStatus: "PENDING", name: null, address: null });
  await seed("0100100079");
  await db.query(`INSERT INTO "RemovalRequest" (id, "taxCode", reason, "contactEmail", "updatedAt") VALUES ('r1', '0100100079', 'x', 'a@b.c', now())`).catch(async () => {
    await db.query(`INSERT INTO "RemovalRequest" (id, "taxCode", reason, "contactEmail") VALUES ('r1', '0100100079', 'x', 'a@b.c')`);
  });
  const stats = await run([
    { taxCode: A, primary: ind("6201"), others: [] },
    { taxCode: B, primary: ind("6201"), others: [] },
    { taxCode: "0100100079", primary: ind("6201"), others: [] },
    { taxCode: "0100100417", primary: ind("6201"), others: [] },
  ]);
  assert.equal(stats.skippedHiddenOrRemoval, 2);
  assert.equal(stats.skippedNotListable, 1);
  assert.equal(stats.companyNotFound, 1);
  assert.equal((await measureCoverage(sql)).withAnyIndustry, 0);
});

test("13-digit branch tax codes keep their suffix and do not collide with the head office", async () => {
  await seed(A);
  await seed(`${A}-001`, { id: "c-branch" });
  await run([
    { taxCode: A, primary: ind("6201"), others: [] },
    { taxCode: `${A}-001`, primary: ind("6202"), others: [] },
  ]);
  assert.deepEqual((await industries(A)).map((r) => r.code), ["6201"]);
  assert.deepEqual((await industries(`${A}-001`)).map((r) => r.code), ["6202"]);
});

test("catalog: canonical name is the most frequent spelling and stays stable once set", async () => {
  await seed(A);
  await seed(B);
  await seed("0100100079");
  await run([
    { taxCode: A, primary: ind("6201", "Lập trình"), others: [] },
    { taxCode: B, primary: ind("6201", "Lập trình"), others: [] },
    { taxCode: "0100100079", primary: ind("6201", "Lập trình máy"), others: [] },
  ]);
  const r = await rebuildIndustryCatalog(sql);
  assert.equal(r.added, 1);
  const name = async () => (await db.query<{ name: string }>(`SELECT name FROM "IndustryCatalog" WHERE code = '6201'`)).rows[0].name;
  assert.equal(await name(), "Lập trình");
  // A later majority for another spelling does not rename the hub (stable slugs).
  await db.query(`UPDATE "CompanyIndustry" SET name = 'Đổi tên'`);
  assert.equal((await rebuildIndustryCatalog(sql)).added, 0);
  assert.equal(await name(), "Lập trình");
});

test("catalog: parentCode only when the parent code exists; level = code length", async () => {
  await seed(A);
  await run([{ taxCode: A, primary: ind("62010"), others: [ind("6201"), ind("62")] }]);
  await rebuildIndustryCatalog(sql);
  const rows = (await db.query<{ code: string; level: number; parentCode: string | null }>(`SELECT code, level, "parentCode" FROM "IndustryCatalog" ORDER BY code`)).rows;
  assert.deepEqual(rows, [
    { code: "62", level: 2, parentCode: null },
    { code: "6201", level: 4, parentCode: null }, // "620" is not in the catalog
    { code: "62010", level: 5, parentCode: "6201" },
  ]);
});

test("coverage and integrity: clean data passes, orphan codes and stale cache are flagged", async () => {
  await seed(A);
  await run([{ taxCode: A, primary: ind("6201"), others: [ind("6202")] }]);
  let c = await measureCoverage(sql);
  assert.equal(c.withPrimaryIndustry, 1);
  assert.equal(c.withSecondaryIndustries, 1);
  assert.equal(c.uniqueIndustries, 2);
  assert.ok(integrityProblems(c).some((p) => p.includes("IndustryCatalog")), "no catalog yet -> orphan codes");
  await rebuildIndustryCatalog(sql);
  c = await measureCoverage(sql);
  assert.deepEqual(integrityProblems(c), []);
  assert.equal(c.missingTaxOffice, 1, "missing nullable fields are reported but are not integrity errors");
});

test("mapper: hcm lists industries without a primary; sonla/quangngai mark the primary", () => {
  const hcm = makeIndustryMapper("hcm", ["MaSoDN", "TenDN", "NganhNghe"]);
  const r = hcm([A, "X", "1621: Gỗ-(x);1622: Đồ gỗ"])!;
  assert.equal(r.primary, null);
  assert.deepEqual(r.others.map((o) => o.code), ["1621", "1622"]);

  const qn = makeIndustryMapper("quangngai", ["Mã số doanh nghiệp", "Ngành nghề KD chính", "Ngành nghề KD", "Số CMND"]);
  const q = qn([A, "4661:Bán buôn nhiên liệu", "4661:Bán buôn nhiên liệu,4669:Bán buôn khác", "210706011"])!;
  assert.equal(q.primary?.code, "4661");
  assert.deepEqual(q.others.map((o) => o.code), ["4669"]);

  const sl = makeIndustryMapper("sonla", ["Mã số doanh nghiệp", "Ngành nghề KD chính"]);
  assert.equal(sl([`${A}001`, "4661:X"])?.taxCode, `${A}-001`);
  assert.equal(sl(["0300588560", "4661:X"]), null, "invalid MST");
  assert.equal(sl([A, "không có mã"]), null, "no parseable industry: nothing invented");
  assert.throws(() => makeIndustryMapper("sonla", ["Mã số doanh nghiệp"]), /missing column/);
});

test("import run: idempotent, resumable through the checkpoint, changed data adds only what is new", async () => {
  await seed(A);
  await seed(B);
  const header = ["Mã số doanh nghiệp", "Ngành nghề KD chính"];
  const rows = [[A, "4661:Bán buôn"], [B, "4212:Xây dựng"], ["bad", "4661:X"]];
  const opts = { apply: true, limit: 1000 };
  const first = await runIndustryImport(sql, "sonla", header, rows, opts);
  assert.equal(first.stats.primaryInserted, 2);
  assert.equal(first.invalidOrEmpty, 1);
  const again = await runIndustryImport(sql, "sonla", header, rows, { ...opts, offset: 0 });
  assert.equal(again.stats.primaryInserted, 0);
  // checkpoint resumes after the last processed row
  const resumed = await runIndustryImport(sql, "sonla", header, rows, opts);
  assert.equal(resumed.start, rows.length);
  assert.equal((await measureCoverage(sql)).withPrimaryIndustry, 2);
});

test("indexability follows coverage: a hub flips to indexable exactly at the threshold and back below it", () => {
  assert.equal(isTaxonomyPageIndexable({ kind: "industry", total: 9 }), false);
  assert.equal(isTaxonomyPageIndexable({ kind: "industry", total: 10 }), true);
  assert.equal(isTaxonomyPageIndexable({ kind: "industry", total: 3 }), false);
  assert.equal(isTaxonomyPageIndexable({ kind: "province-industry", total: 29 }), false);
  assert.equal(isTaxonomyPageIndexable({ kind: "province-industry", total: 30 }), true);
});
