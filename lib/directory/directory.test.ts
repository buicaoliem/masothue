import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { isAdminAuthorized } from "./admin-auth";
import { DIRECTORY_GROUPS } from "./groups";
import { createDirectory, RATE_LIMIT_PER_DAY, type Directory } from "./service";
import type { Sql } from "./sql";

// Runs every repo migration against an in-memory Postgres, then exercises the real SQL.

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");

function pgliteSql(db: PGlite): Sql {
  const wrap = (c: Pick<PGlite, "query">): Sql => ({
    query: async <T>(text: string, params: unknown[] = []) => (await c.query<T>(text, params)).rows,
    transaction: (fn) => fn(wrap(c)),
  });
  return { ...wrap(db), transaction: (fn) => db.transaction((tx) => fn(wrap(tx))) };
}

const MST_A = "0300588569"; // Vinamilk (valid check digit)
const MST_B = "0101248141"; // FPT
const MST_C = "0100109106";
const MST_D = "0100233583";

let db: PGlite;
let sql: Sql;
let dir: Directory;
let clock: Date;
let enriched: string[];

async function seedCompany(taxCode: string, fields: { name?: string; address?: string; isHidden?: boolean } = {}) {
  await db.query(
    `INSERT INTO "Company" (id, "taxCode", name, address, "enrichStatus", "isHidden", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [
      `c-${taxCode}`, taxCode, fields.name ?? null, fields.address ?? null,
      fields.name ? "OK" : "PENDING", fields.isHidden ?? false,
    ],
  );
}

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

async function submitAndApprove(mst: string, over: Record<string, unknown> = {}) {
  const r = await dir.submitProfile(validInput({ mst, ...over }), `ip-${mst}`, null);
  assert.ok(r.ok && r.id, JSON.stringify(r));
  const a = await dir.approveSubmission(r.id!);
  assert.ok(a.ok, JSON.stringify(a));
}

beforeEach(async () => {
  db = new PGlite();
  for (const dirName of readdirSync(MIGRATIONS).filter((d) => /^\d/.test(d)).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, dirName, "migration.sql"), "utf8"));
  }
  sql = pgliteSql(db);
  clock = new Date("2026-09-16T08:00:00Z");
  enriched = [];
  dir = createDirectory({
    sql,
    enrich: async (mst) => void enriched.push(mst),
    verifyTurnstile: async () => true,
    now: () => clock,
  });
});

test("có đúng 41 ngành, slug không trùng", () => {
  assert.equal(DIRECTORY_GROUPS.length, 41);
  assert.equal(new Set(DIRECTORY_GROUPS.map((g) => g.slug)).size, 41);
  assert.equal(DIRECTORY_GROUPS[0].slug, "ke-toan-thue");
  assert.equal(DIRECTORY_GROUPS[40].slug, "khac");
});

test("MST sai chữ số kiểm tra bị từ chối", async () => {
  const r = await dir.submitProfile(validInput({ mst: "0300588560" }), "1.1.1.1", null);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.errors?.mst);
});

test("MST 13 số được chuẩn hóa có gạch ngang", async () => {
  const r = await dir.submitProfile(validInput({ mst: "0300588569001" }), "1.1.1.1", null);
  assert.ok(r.ok);
  const [row] = await dir.listPendingSubmissions();
  assert.equal(row.mst, "0300588569-001");
});

test("có thông tin liên hệ công khai thì phải đồng ý công khai", async () => {
  const bad = await dir.submitProfile(validInput({ publicPhone: "0901234567" }), "1.1.1.1", null);
  assert.ok(!bad.ok && bad.errors?.consentPublish);
  const good = await dir.submitProfile(validInput({ publicPhone: "0901234567", consentPublish: true }), "1.1.1.1", null);
  assert.ok(good.ok);
  const none = await dir.submitProfile(validInput(), "1.1.1.1", null);
  assert.ok(none.ok, "không có liên hệ công khai thì không cần đồng ý");
});

test("phải xác nhận có quyền đăng", async () => {
  const r = await dir.submitProfile(validInput({ confirmAuthority: false }), "1.1.1.1", null);
  assert.ok(!r.ok && r.errors?.confirmAuthority);
});

test("tối đa 6 dịch vụ, giới hạn độ dài", async () => {
  const svc = (i: number) => ({ name: `Dịch vụ ${i}`, detail: "" });
  const six = await dir.submitProfile(validInput({ services: [1, 2, 3, 4, 5, 6].map(svc) }), "1.1.1.1", null);
  assert.ok(six.ok);
  const seven = await dir.submitProfile(validInput({ services: [1, 2, 3, 4, 5, 6, 7].map(svc) }), "1.1.1.1", null);
  assert.ok(!seven.ok && seven.errors?.services);
  const longName = await dir.submitProfile(validInput({ services: [{ name: "x".repeat(61), detail: "" }] }), "1.1.1.1", null);
  assert.ok(!longName.ok && longName.errors?.["services.0.name"]);
  const longDesc = await dir.submitProfile(validInput({ description: "x".repeat(301) }), "1.1.1.1", null);
  assert.ok(!longDesc.ok && longDesc.errors?.description);
});

test("giới hạn 5 lần gửi mỗi IP trong 24 giờ", async () => {
  for (let i = 0; i < RATE_LIMIT_PER_DAY; i++) {
    assert.ok((await dir.submitProfile(validInput(), "9.9.9.9", null)).ok);
  }
  const sixth = await dir.submitProfile(validInput(), "9.9.9.9", null);
  assert.equal(sixth.ok, false);
  assert.ok((await dir.submitProfile(validInput(), "8.8.8.8", null)).ok, "IP khác không bị ảnh hưởng");
  clock = new Date(clock.getTime() + 24 * 3600 * 1000 + 1000);
  assert.ok((await dir.submitProfile(validInput(), "9.9.9.9", null)).ok, "sau 24 giờ gửi lại được");

  for (let i = 0; i < RATE_LIMIT_PER_DAY; i++) {
    assert.ok((await dir.createSponsorLead(lead(), "7.7.7.7", null)).ok);
  }
  assert.equal((await dir.createSponsorLead(lead(), "7.7.7.7", null)).ok, false);
});

test("không lưu IP gốc, chỉ lưu hash", async () => {
  await dir.submitProfile(validInput(), "203.0.113.9", null);
  const rows = await sql.query<{ ip_hash: string }>(`SELECT ip_hash FROM profile_submission`);
  assert.match(rows[0].ip_hash, /^[0-9a-f]{64}$/);
  assert.ok(!rows[0].ip_hash.includes("203.0.113.9"));
});

test("honeypot có giá trị: trả về thành công nhưng không lưu", async () => {
  const r = await dir.submitProfile(validInput({ honeypot: "http://spam" }), "1.1.1.1", null);
  assert.ok(r.ok);
  assert.equal((await dir.listPendingSubmissions()).length, 0);
});

test("Turnstile sai thì từ chối", async () => {
  const strict = createDirectory({ sql, enrich: async () => {}, verifyTurnstile: async () => false, now: () => clock });
  const r = await strict.submitProfile(validInput(), "1.1.1.1", "bad");
  assert.equal(r.ok, false);
});

test("MST đang ẩn hoặc có yêu cầu gỡ bị từ chối và không xuất hiện ở mọi chỗ công khai", async () => {
  // Profiles approved while visible
  await seedCompany(MST_A, { name: "Công ty A", address: "HCM" });
  await seedCompany(MST_B, { name: "Công ty B", address: "HCM" });
  await submitAndApprove(MST_A);
  await submitAndApprove(MST_B);
  await submitAndApprove(MST_C);
  for (const m of [MST_A, MST_B]) {
    const r = await dir.createPlacement({
      mst: m, groupSlug: "ke-toan-thue", provinceSlug: "ho-chi-minh", position: m === MST_A ? 1 : 2,
      startsAt: "2026-09-01", endsAt: "2026-10-01",
    });
    assert.ok(r.ok, JSON.stringify(r));
  }
  assert.equal(await dir.countProfiles("ke-toan-thue", "ho-chi-minh"), 3);
  assert.equal(await dir.isIndexable("ke-toan-thue", "ho-chi-minh"), true);

  // A gets hidden, B gets a pending takedown request
  await db.query(`UPDATE "Company" SET "isHidden" = true WHERE "taxCode" = $1`, [MST_A]);
  await db.query(
    `INSERT INTO "RemovalRequest" (id, "taxCode", reason, "contactEmail") VALUES ('rr1', $1, 'Xin gỡ thông tin', 'a@b.vn')`,
    [MST_B],
  );

  for (const m of [MST_A, MST_B]) {
    const r = await dir.submitProfile(validInput({ mst: m }), "5.5.5.5", null);
    assert.ok(!r.ok && r.message.includes("/yeu-cau-go-thong-tin"), JSON.stringify(r));
    assert.equal(await dir.getProfile(m), null);
    assert.equal((await dir.createPlacement({
      mst: m, groupSlug: "khac", provinceSlug: "ha-noi", position: 1, startsAt: "2026-09-01", endsAt: "2026-10-01",
    })).ok, false);
  }
  const listed = (await dir.listProfiles("ke-toan-thue", "ho-chi-minh")).map((p) => p.mst);
  assert.deepEqual(listed, [MST_C]);
  assert.equal(await dir.countProfiles("ke-toan-thue", "ho-chi-minh"), 1);
  assert.deepEqual(await dir.getActivePlacements("ke-toan-thue", "ho-chi-minh", clock), []);
  assert.equal(await dir.isIndexable("ke-toan-thue", "ho-chi-minh"), false);
  assert.ok(await dir.getProfile(MST_C));
});

test("hồ sơ đang chờ duyệt không thể duyệt nếu MST bị ẩn sau khi gửi", async () => {
  const r = await dir.submitProfile(validInput(), "1.1.1.1", null);
  assert.ok(r.ok);
  await seedCompany(MST_A, { name: "A", address: "B", isHidden: true });
  assert.equal((await dir.approveSubmission(r.id!)).ok, false);
});

test("vị trí nổi bật trùng thời gian bị từ chối, nối tiếp thì được", async () => {
  const base = { mst: MST_A, groupSlug: "ke-toan-thue", provinceSlug: "ha-noi", position: 1 };
  assert.ok((await dir.createPlacement({ ...base, startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-10-01T00:00:00Z" })).ok);
  const overlap = await dir.createPlacement({ ...base, mst: MST_B, startsAt: "2026-09-20T00:00:00Z", endsAt: "2026-11-01T00:00:00Z" });
  assert.ok(!overlap.ok && overlap.message.includes(MST_A), JSON.stringify(overlap));
  const inside = await dir.createPlacement({ ...base, mst: MST_B, startsAt: "2026-09-05T00:00:00Z", endsAt: "2026-09-06T00:00:00Z" });
  assert.equal(inside.ok, false);
  assert.ok((await dir.createPlacement({ ...base, mst: MST_B, startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-11-01T00:00:00Z" })).ok);
  assert.ok((await dir.createPlacement({ ...base, mst: MST_C, position: 2, startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-10-01T00:00:00Z" })).ok);
  assert.ok((await dir.createPlacement({ ...base, mst: MST_C, provinceSlug: "hue", startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-10-01T00:00:00Z" })).ok);
  assert.equal((await dir.createPlacement({ ...base, position: 4, startsAt: "2026-12-01", endsAt: "2027-01-01" })).ok, false);
  assert.equal((await dir.createPlacement({ ...base, startsAt: "2027-01-01", endsAt: "2026-12-01" })).ok, false);
  assert.equal((await dir.listPlacements()).length, 4);
});

test("getActivePlacements: đúng khoảng thời gian, sắp theo vị trí, chỉ DN đã duyệt", async () => {
  await submitAndApprove(MST_A);
  await submitAndApprove(MST_B);
  const g = { groupSlug: "ke-toan-thue", provinceSlug: "ho-chi-minh" };
  await dir.createPlacement({ ...g, mst: MST_B, position: 1, startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-10-01T00:00:00Z" });
  await dir.createPlacement({ ...g, mst: MST_A, position: 2, startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-10-01T00:00:00Z" });
  await dir.createPlacement({ ...g, mst: MST_D, position: 3, startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-10-01T00:00:00Z" }); // no profile
  const at = new Date("2026-09-16T00:00:00Z");
  assert.deepEqual((await dir.getActivePlacements(g.groupSlug, g.provinceSlug, at)).map((p) => [p.position, p.mst]), [[1, MST_B], [2, MST_A]]);
  assert.equal((await dir.getActivePlacements(g.groupSlug, g.provinceSlug, new Date("2026-10-01T00:00:00Z"))).length, 0, "ends_at là mốc loại trừ");
  assert.equal((await dir.getActivePlacements(g.groupSlug, g.provinceSlug, new Date("2026-09-01T00:00:00Z"))).length, 2, "starts_at là mốc bao gồm");
});

test("duyệt hồ sơ dùng tên/địa chỉ chính thức và so khớp tên không phân biệt hoa thường, dấu", async () => {
  await seedCompany(MST_A, { name: "CÔNG TY CỔ PHẦN SỮA VIỆT NAM", address: "Số 10 Tân Trào, Phường Tân Phú, TP. Hồ Chí Minh" });
  await submitAndApprove(MST_A, { companyName: "cong ty co phan sua viet nam" });
  assert.deepEqual(enriched, [MST_A]);
  const p = await dir.getProfile(MST_A);
  assert.equal(p?.companyName, "CÔNG TY CỔ PHẦN SỮA VIỆT NAM");
  assert.equal(p?.address, "Số 10 Tân Trào, Phường Tân Phú, TP. Hồ Chí Minh");
  const [s] = await sql.query<{ name_matches_registry: boolean; status: string }>(`SELECT name_matches_registry, status FROM profile_submission`);
  assert.equal(s.name_matches_registry, true);
  assert.equal(s.status, "APPROVED");

  await seedCompany(MST_B, { name: "CÔNG TY CỔ PHẦN FPT", address: "Hà Nội" });
  await submitAndApprove(MST_B, { companyName: "Công ty Tên Khác" });
  const [b] = await sql.query<{ name_matches_registry: boolean }>(`SELECT name_matches_registry FROM profile_submission WHERE mst = $1`, [MST_B]);
  assert.equal(b.name_matches_registry, false);
  assert.equal((await dir.getProfile(MST_B))?.companyName, "CÔNG TY CỔ PHẦN FPT");

  // No registry data: submitted values, match unknown
  await submitAndApprove(MST_C, { companyName: "Công ty C tự khai" });
  assert.equal((await dir.getProfile(MST_C))?.companyName, "Công ty C tự khai");
  const [c] = await sql.query<{ name_matches_registry: boolean | null }>(`SELECT name_matches_registry FROM profile_submission WHERE mst = $1`, [MST_C]);
  assert.equal(c.name_matches_registry, null);
});

test("hồ sơ cũ vẫn hiển thị cho đến khi bản mới được duyệt; logo được giữ", async () => {
  await submitAndApprove(MST_C, { description: "Bản cũ" });
  await db.query(`UPDATE business_profile SET logo_url = 'https://cdn/logo.png'`);
  const r = await dir.submitProfile(validInput({ mst: MST_C, description: "Bản mới" }), "2.2.2.2", null);
  assert.ok(r.ok);
  assert.equal((await dir.getProfile(MST_C))?.description, "Bản cũ");
  assert.ok((await dir.approveSubmission(r.id!)).ok);
  const p = await dir.getProfile(MST_C);
  assert.equal(p?.description, "Bản mới");
  assert.equal(p?.logoUrl, "https://cdn/logo.png");
  assert.equal((await dir.approveSubmission(r.id!)).ok, false, "không duyệt lại lần hai");
});

test("từ chối cần lý do", async () => {
  const r = await dir.submitProfile(validInput(), "1.1.1.1", null);
  assert.equal((await dir.rejectSubmission(r.ok ? r.id! : "", "  ")).ok, false);
  assert.ok((await dir.rejectSubmission(r.ok ? r.id! : "", "Không xác minh được qua điện thoại")).ok);
  assert.equal((await dir.listPendingSubmissions()).length, 0);
});

test("đọc công khai không trả về thông tin người gửi hay ip_hash", async () => {
  await submitAndApprove(MST_A, { publicPhone: "0901234567", consentPublish: true });
  await dir.createPlacement({ mst: MST_A, groupSlug: "ke-toan-thue", provinceSlug: "ho-chi-minh", position: 1, startsAt: "2026-09-01", endsAt: "2026-10-01" });
  const rows: object[] = [
    ...(await dir.listProfiles("ke-toan-thue", "ho-chi-minh")),
    ...(await dir.getActivePlacements("ke-toan-thue", "ho-chi-minh", clock)),
    (await dir.getProfile(MST_A))!,
  ];
  assert.equal(rows.length, 3);
  for (const row of rows) {
    const keys = Object.keys(row).join(",").toLowerCase();
    assert.ok(!/submitter|ip_?hash|confirm|consent/.test(keys), keys);
    assert.ok(!JSON.stringify(row).includes("0912345678"), "không lộ SĐT người gửi");
  }
  assert.equal((rows[0] as { publicPhone: string }).publicPhone, "0901234567");
});

test("isIndexable cần ít nhất 3 hồ sơ; listProfiles phân trang 20", async () => {
  await submitAndApprove(MST_A);
  await submitAndApprove(MST_B);
  assert.equal(await dir.isIndexable("ke-toan-thue", "ho-chi-minh"), false);
  await submitAndApprove(MST_C);
  assert.equal(await dir.isIndexable("ke-toan-thue", "ho-chi-minh"), true);
  assert.equal(await dir.isIndexable("ke-toan-thue", "ha-noi"), false);

  for (let i = 0; i < 20; i++) {
    const mst = `${validBody(i)}`;
    await sql.query(
      `INSERT INTO business_profile (mst, company_name, address, province_slug, group_slug, description, source_submission_id, approved_at)
       VALUES ($1, 'X', 'Y', 'ho-chi-minh', 'ke-toan-thue', 'Z', 's', now())`,
      [mst],
    );
  }
  assert.equal(await dir.countProfiles("ke-toan-thue", "ho-chi-minh"), 23);
  assert.equal((await dir.listProfiles("ke-toan-thue", "ho-chi-minh", 1)).length, 20);
  assert.equal((await dir.listProfiles("ke-toan-thue", "ho-chi-minh", 2)).length, 3);
});

test("khách hàng tiềm năng: tạo, liệt kê, đổi trạng thái", async () => {
  const r = await dir.createSponsorLead(lead(), "1.1.1.1", null);
  assert.ok(r.ok && r.id);
  assert.equal((await dir.createSponsorLead(lead({ mst: "123" }), "1.1.1.1", null)).ok, false);
  assert.ok((await dir.setLeadStatus(r.id!, "CALLED")).ok);
  assert.equal((await dir.setLeadStatus(r.id!, "BOGUS" as never)).ok, false);
  const [row] = await dir.listSponsorLeads();
  assert.equal(row.status, "CALLED");
  assert.ok(!("ipHash" in row) && !("ip_hash" in row));
});

test("admin guard: từ chối tất cả khi thiếu cấu hình", async () => {
  const header = `Basic ${Buffer.from("admin:secret").toString("base64")}`;
  delete process.env.ADMIN_USER;
  delete process.env.ADMIN_PASSWORD;
  assert.equal(await isAdminAuthorized(header), false);
  process.env.ADMIN_USER = "admin";
  assert.equal(await isAdminAuthorized(header), false);
  process.env.ADMIN_PASSWORD = "secret";
  assert.equal(await isAdminAuthorized(header), true);
  assert.equal(await isAdminAuthorized(`Basic ${Buffer.from("admin:wrong").toString("base64")}`), false);
  assert.equal(await isAdminAuthorized(null), false);
  delete process.env.ADMIN_USER;
  delete process.env.ADMIN_PASSWORD;
});

function lead(over: Record<string, unknown> = {}) {
  return {
    contactName: "Trần B",
    phone: "+84 912 345 678",
    mst: "",
    groupSlug: "ke-toan-thue",
    provinceSlug: "ha-noi",
    message: "Muốn đứng đầu ngành",
    ...over,
  };
}

/** A checksum-valid 10-digit MST built from a counter. */
function validBody(i: number): string {
  const body = String(200000000 + i);
  const w = [31, 29, 23, 19, 17, 13, 7, 5, 3];
  const sum = w.reduce((a, x, k) => a + x * Number(body[k]), 0);
  return body + ((10 - (sum % 11)) % 10);
}
