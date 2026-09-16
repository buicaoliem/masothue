import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { createDirectory, type Directory } from "@/lib/directory/service";
import type { Sql } from "@/lib/directory/sql";
import { assertAdmin } from "./guard";

// Same PGlite-replays-every-migration harness as lib/directory/directory.test.ts.

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");

function pgliteSql(db: PGlite): Sql {
  const wrap = (c: Pick<PGlite, "query">): Sql => ({
    query: async <T>(text: string, params: unknown[] = []) => (await c.query<T>(text, params)).rows,
    transaction: (fn) => fn(wrap(c)),
  });
  return { ...wrap(db), transaction: (fn) => db.transaction((tx) => fn(wrap(tx))) };
}

const MST_A = "0300588569"; // Vinamilk (valid check digit)

let db: PGlite;
let sql: Sql;
let dir: Directory;

function validInput(over: Record<string, unknown> = {}) {
  return {
    mst: MST_A,
    companyName: "Công ty Cổ phần Sữa Việt Nam",
    address: "10 Tân Trào, Quận 7",
    provinceSlug: "ho-chi-minh",
    groupSlug: "ke-toan-thue",
    description: "Dịch vụ kế toán trọn gói.",
    services: [{ name: "Báo cáo thuế", detail: "Hàng tháng" }],
    publicPhone: "",
    publicZalo: "",
    website: "",
    publicEmail: "",
    consentPublish: false,
    submitterName: "Nguyễn Văn A",
    submitterRole: "Giám đốc",
    submitterPhone: "0912 345 678",
    confirmAuthority: true,
    honeypot: "",
    ...over,
  };
}

beforeEach(async () => {
  db = new PGlite();
  for (const dirName of readdirSync(MIGRATIONS).filter((d) => /^\d/.test(d)).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, dirName, "migration.sql"), "utf8"));
  }
  sql = pgliteSql(db);
  dir = createDirectory({ sql, enrich: async () => {}, verifyTurnstile: async () => true });
});

test("assertAdmin: thiếu thông tin đăng nhập thì bị từ chối, đủ thông tin đúng thì cho qua", async () => {
  delete process.env.ADMIN_USER;
  delete process.env.ADMIN_PASSWORD;
  await assert.rejects(() => assertAdmin(new Headers()));

  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASSWORD = "secret";
  const wrongAuth = new Headers({ authorization: `Basic ${Buffer.from("admin:wrong").toString("base64")}` });
  await assert.rejects(() => assertAdmin(wrongAuth));

  const okAuth = new Headers({ authorization: `Basic ${Buffer.from("admin:secret").toString("base64")}` });
  await assert.doesNotReject(() => assertAdmin(okAuth));

  delete process.env.ADMIN_USER;
  delete process.env.ADMIN_PASSWORD;
});

test("honeypot có giá trị thì không lưu gì (hồ sơ và khách hàng tiềm năng)", async () => {
  const r = await dir.submitProfile(validInput({ honeypot: "http://spam.example" }), "1.2.3.4", null);
  assert.ok(r.ok);
  assert.equal((await dir.listPendingSubmissions()).length, 0);

  const lead = await dir.createSponsorLead(
    { contactName: "X", phone: "0912345678", mst: "", groupSlug: "ke-toan-thue", provinceSlug: "ha-noi", message: "", honeypot: "yes" },
    "1.2.3.4",
    null,
  );
  assert.ok(lead.ok);
  assert.equal((await dir.listSponsorLeads()).length, 0);
});

test("có liên hệ công khai mà không đồng ý công khai thì server từ chối (không chỉ client)", async () => {
  const noConsent = await dir.submitProfile(validInput({ publicEmail: "a@b.vn", consentPublish: false }), "5.5.5.5", null);
  assert.equal(noConsent.ok, false);
  assert.ok(!noConsent.ok && noConsent.errors?.consentPublish);

  const withConsent = await dir.submitProfile(validInput({ publicEmail: "a@b.vn", consentPublish: true }), "5.5.5.5", null);
  assert.ok(withConsent.ok);
});

test("tạo vị trí nổi bật cho MST chưa có hồ sơ được duyệt: vẫn lưu được, và cờ cảnh báo bật lên", async () => {
  // Mirrors app/admin/actions.ts's createPlacementAction: create, then check getProfile === null.
  const r = await dir.createPlacement({
    mst: MST_A,
    groupSlug: "ke-toan-thue",
    provinceSlug: "ho-chi-minh",
    position: 1,
    startsAt: "2026-09-01",
    endsAt: "2026-10-01",
  });
  assert.ok(r.ok, JSON.stringify(r));
  const profile = await dir.getProfile(MST_A);
  assert.equal(profile, null, "chưa có hồ sơ được duyệt nên phải cảnh báo");
});
