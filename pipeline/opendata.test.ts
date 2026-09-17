import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "@/lib/directory/sql";
import { makeMapper, parseCsv, parseMainIndustry, runImport } from "./opendata";

// Same PGlite-replays-every-migration harness as lib/removal.test.ts.
const MIGRATIONS = join(process.cwd(), "prisma", "migrations");

function pgliteSql(db: PGlite): Sql {
  const wrap = (c: Pick<PGlite, "query">): Sql => ({
    query: async <T>(text: string, params: unknown[] = []) => (await c.query<T>(text, params)).rows,
    transaction: (fn) => fn(wrap(c)),
  });
  return { ...wrap(db), transaction: (fn) => db.transaction((tx) => fn(wrap(tx))) };
}

// Quảng Ngãi-shaped header, including sensitive columns that must be dropped.
const QN_HEADER = [
  "Mã số doanh nghiệp", "Tên doanh nghiệp", "Địa chỉ trụ sở chính", "Vốn điều lệ", "Trạng thái", "Điện thoại", "Email",
  "Người đại diện theo pháp luật", "Ngày sinh người đại diện theo pháp luật", "Số CMND", "Chủ sở hữu",
  "Ngành nghề KD chính", "Ngày cấp", "Loại hình DN", "Số lượng lao động",
];

function qnRow(mst: string, name = "CÔNG TY TNHH A", address = "Số 1, Phường X, Tỉnh Quảng Ngãi, Việt Nam") {
  return [
    mst, name, address, 500000000, "Đang hoạt động", "0255-3823428", "secret@example.vn",
    "NGUYỄN VĂN A", 22385, "210706011", "TRẦN THỊ B",
    "4661:Bán buôn nhiên liệu rắn, lỏng, khí và các sản phẩm liên quan", 33966, "Công ty cổ phần", 5,
  ];
}

const MST = ["0300588569", "0100109106", "0100111948", "0100100079", "0100100417"];
const INVALID = "0300588560";

let db: PGlite;
let sql: Sql;

beforeEach(async () => {
  db = new PGlite();
  for (const dirName of readdirSync(MIGRATIONS).filter((d) => /^\d/.test(d)).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, dirName, "migration.sql"), "utf8"));
  }
  sql = pgliteSql(db);
});

async function seed(taxCode: string, cols: Record<string, unknown> = {}) {
  const all = { id: `c-${taxCode}`, taxCode, updatedAt: new Date(), ...cols };
  const keys = Object.keys(all);
  await db.query(
    `INSERT INTO "Company" (${keys.map((k) => `"${k}"`).join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")})`,
    Object.values(all),
  );
}

async function row(taxCode: string) {
  return (await db.query<Record<string, unknown>>(`SELECT * FROM "Company" WHERE "taxCode" = $1`, [taxCode])).rows[0];
}

test("whitelist: sensitive columns never leave the mapper", () => {
  const rec = makeMapper("quangngai", QN_HEADER)(qnRow(MST[0]));
  assert.ok(rec);
  assert.deepEqual(Object.keys(rec).sort(), ["activeDate", "address", "legalType", "mainIndustry", "name", "representativeName", "status", "taxCode"]);
  const json = JSON.stringify(rec);
  for (const secret of ["0255-3823428", "secret@example.vn", "210706011", "TRẦN THỊ B", "500000000"]) {
    assert.ok(!json.includes(secret), secret);
  }
  assert.equal(rec.status, "NNT đang hoạt động");
  assert.equal(rec.activeDate, "1992-12-28");
  assert.equal(rec.mainIndustry, "4661 - Bán buôn nhiên liệu rắn, lỏng, khí và các sản phẩm liên quan");
});

test("main industry: first entry only, detail removed", () => {
  assert.equal(parseMainIndustry("1621: Sản xuất gỗ dán-(không hoạt động tại trụ sở);1622: Khác"), "1621 - Sản xuất gỗ dán");
  assert.equal(parseMainIndustry("5510: Dịch vụ lưu trú ngắn ngày--Chi tiết: Khách sạn;"), "5510 - Dịch vụ lưu trú ngắn ngày");
  assert.equal(parseMainIndustry("không rõ"), null);
});

test("csv parser handles quotes, embedded commas and newlines", async () => {
  async function* chunks() {
    yield 'a,b\n1,"x, ""y""\nz"\r\n';
    yield "2,w\n";
  }
  const rows: string[][] = [];
  for await (const r of parseCsv(chunks())) rows.push(r);
  assert.deepEqual(rows, [["a", "b"], ["1", 'x, "y"\nz'], ["2", "w"]]);
});

test("existing values are never overwritten; only nulls filled; OK needs name + address", async () => {
  await seed(MST[0], { name: "Tên cũ", status: "NNT tạm ngừng KD có thời hạn", provinceSlug: "ha-noi", province: "TP. Hà Nội" });
  await seed(MST[1]); // bare PENDING row
  await seed(MST[2], { enrichStatus: "SOURCE_MISS" });
  const { stats } = await runImport(sql, "quangngai", QN_HEADER, [qnRow(MST[0]), qnRow(MST[1]), qnRow(MST[2], "CÔNG TY C", "")], {
    apply: true,
    limit: 1000,
  });
  const a = await row(MST[0]);
  assert.equal(a.name, "Tên cũ");
  assert.equal(a.status, "NNT tạm ngừng KD có thời hạn");
  assert.equal(a.provinceSlug, "ha-noi");
  assert.equal(a.address, "Số 1, Phường X, Tỉnh Quảng Ngãi, Việt Nam");
  assert.equal(a.enrichStatus, "OK");
  assert.equal(a.dataSource, "opendata-quangngai");

  const b = await row(MST[1]);
  assert.equal(b.name, "CÔNG TY TNHH A");
  assert.equal(b.provinceSlug, "quang-ngai");
  assert.equal(b.province, "Quảng Ngãi");
  assert.equal(b.legalType, "Công ty cổ phần");
  assert.equal(b.enrichStatus, "OK");
  assert.equal((b.dataAsOf as Date).toISOString().slice(0, 10), "2025-03-27");

  // name but no address → status unchanged
  const c = await row(MST[2]);
  assert.equal(c.name, "CÔNG TY C");
  assert.equal(c.address, null);
  assert.equal(c.enrichStatus, "SOURCE_MISS");
  assert.equal(stats.becomeOk, 2);
});

test("hidden rows, rows with a removal request, unknown and invalid MSTs are skipped", async () => {
  await seed(MST[0], { isHidden: true });
  await seed(MST[1]);
  await db.query(
    `INSERT INTO "RemovalRequest" (id, "taxCode", reason, "contactEmail", status) VALUES ('rr1', $1, 'x', 'a@b.vn', 'PENDING')`,
    [MST[1]],
  );
  const { stats } = await runImport(sql, "quangngai", QN_HEADER, [qnRow(MST[0]), qnRow(MST[1]), qnRow(MST[3]), qnRow(INVALID)], {
    apply: true,
    limit: 1000,
  });
  assert.equal((await row(MST[0])).name, null);
  assert.equal((await row(MST[1])).name, null);
  assert.equal(await row(MST[3]), undefined, "no rows are created");
  assert.equal(stats.hidden, 1);
  assert.equal(stats.removal, 1);
  assert.equal(stats.notInDb, 1);
  assert.equal(stats.invalidMst, 1);
  assert.equal(stats.updatedRows, 0);
});

test("dry run writes nothing (no company change, no checkpoint)", async () => {
  await seed(MST[0]);
  const { stats } = await runImport(sql, "quangngai", QN_HEADER, [qnRow(MST[0])], { apply: false, limit: 1000 });
  assert.equal(stats.fill.name, 1);
  assert.equal(stats.becomeOk, 1);
  const r = await row(MST[0]);
  assert.equal(r.name, null);
  assert.equal(r.enrichStatus, "PENDING");
  assert.equal((await db.query(`SELECT 1 FROM "IngestCheckpoint"`)).rows.length, 0);
});

test("rerun continues from the checkpoint and does not reprocess rows", async () => {
  for (const m of MST) await seed(m);
  const rows = MST.map((m) => qnRow(m));
  const first = await runImport(sql, "quangngai", QN_HEADER, rows, { apply: true, limit: 3 });
  assert.equal(first.stats.read, 3);
  assert.equal(first.nextRow, 3);
  assert.equal((await row(MST[3])).name, null);

  const second = await runImport(sql, "quangngai", QN_HEADER, rows, { apply: true, limit: 1000 });
  assert.equal(second.start, 3);
  assert.equal(second.stats.read, 2);
  assert.equal(second.stats.updatedRows, 2);
  assert.equal((await row(MST[4])).name, "CÔNG TY TNHH A");

  const third = await runImport(sql, "quangngai", QN_HEADER, rows, { apply: true, limit: 1000 });
  assert.equal(third.stats.read, 0);
  const cp = (await db.query<{ status: string }>(`SELECT status FROM "IngestCheckpoint" WHERE scope = 'opendata-quangngai'`)).rows[0];
  assert.equal(cp.status, "done");
});
