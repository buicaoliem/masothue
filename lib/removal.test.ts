import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { createRemovalService } from "./removal";
import type { Sql } from "./directory/sql";

// Same PGlite-replays-every-migration harness as lib/directory/directory.test.ts.

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");

function pgliteSql(db: PGlite): Sql {
  const wrap = (c: Pick<PGlite, "query">): Sql => ({
    query: async <T>(text: string, params: unknown[] = []) => (await c.query<T>(text, params)).rows,
    transaction: (fn) => fn(wrap(c)),
  });
  return { ...wrap(db), transaction: (fn) => db.transaction((tx) => fn(wrap(tx))) };
}

const MST_A = "0300588569";

let db: PGlite;
let sql: Sql;
let removal: ReturnType<typeof createRemovalService>;

async function seedCompany(taxCode: string, isHidden = false) {
  await db.query(
    `INSERT INTO "Company" (id, "taxCode", name, address, "enrichStatus", "isHidden", "updatedAt")
     VALUES ($1, $2, 'Công ty A', '123 Đường A', 'OK', $3, now())`,
    [`c-${taxCode}`, taxCode, isHidden],
  );
}

async function seedRemoval(id: string, taxCode: string, status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING") {
  await db.query(
    `INSERT INTO "RemovalRequest" (id, "taxCode", reason, "contactEmail", "requesterName", status)
     VALUES ($1, $2, 'Xin gỡ thông tin doanh nghiệp', 'a@b.vn', 'Nguyễn Văn A', $3)`,
    [id, taxCode, status],
  );
}

async function companyIsHidden(taxCode: string): Promise<boolean> {
  const rows = await db.query<{ isHidden: boolean }>(`SELECT "isHidden" FROM "Company" WHERE "taxCode" = $1`, [taxCode]);
  return rows.rows[0].isHidden;
}

beforeEach(async () => {
  db = new PGlite();
  for (const dirName of readdirSync(MIGRATIONS).filter((d) => /^\d/.test(d)).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, dirName, "migration.sql"), "utf8"));
  }
  sql = pgliteSql(db);
  removal = createRemovalService(sql);
});

test("listPendingRemovals: chỉ trả về PENDING, kèm tên công ty", async () => {
  await seedCompany(MST_A);
  await seedRemoval("rr1", MST_A, "PENDING");
  await seedRemoval("rr2", MST_A, "APPROVED");
  const rows = await removal.listPendingRemovals();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "rr1");
  assert.equal(rows[0].companyName, "Công ty A");
});

test("approveRemoval: đổi trạng thái APPROVED và ẩn công ty trong cùng một giao dịch", async () => {
  await seedCompany(MST_A);
  await seedRemoval("rr1", MST_A, "PENDING");
  const r = await removal.approveRemoval("rr1");
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.ok && r.taxCode, MST_A);
  assert.equal(await companyIsHidden(MST_A), true);
  const status = await db.query<{ status: string }>(`SELECT status FROM "RemovalRequest" WHERE id = $1`, ["rr1"]);
  assert.equal(status.rows[0].status, "APPROVED");
});

test("approveRemoval: yêu cầu đã xử lý thì báo lỗi, không đổi gì thêm", async () => {
  await seedCompany(MST_A);
  await seedRemoval("rr1", MST_A, "REJECTED");
  const r = await removal.approveRemoval("rr1");
  assert.equal(r.ok, false);
  assert.equal(await companyIsHidden(MST_A), false);
});

test("rejectRemoval: cần lý do, đổi trạng thái REJECTED, không đụng tới isHidden", async () => {
  await seedCompany(MST_A);
  await seedRemoval("rr1", MST_A, "PENDING");

  const noReason = await removal.rejectRemoval("rr1", "  ");
  assert.equal(noReason.ok, false);

  const r = await removal.rejectRemoval("rr1", "Không xác minh được người yêu cầu");
  assert.ok(r.ok);
  assert.equal(await companyIsHidden(MST_A), false);
  const status = await db.query<{ status: string }>(`SELECT status FROM "RemovalRequest" WHERE id = $1`, ["rr1"]);
  assert.equal(status.rows[0].status, "REJECTED");
});
