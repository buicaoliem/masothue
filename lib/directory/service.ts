import { randomUUID } from "node:crypto";
import type { Sql } from "./sql";
import { findDirectoryGroup } from "./groups";
import { hashIp, verifyTurnstile as verifyTurnstileDefault } from "./security";
import {
  fieldErrors,
  mstSchema,
  normalizeName,
  placementSchema,
  profileSubmissionSchema,
  sponsorLeadSchema,
  type FieldErrors,
  type PlacementInput,
  type ProfileSubmissionInput,
  type ServiceItem,
  type SponsorLeadInput,
} from "./validation";
import { SITE_URL } from "@/lib/site";
import { buildProfileSubmissionMessage, buildSponsorLeadMessage, scheduleNotify } from "@/lib/notify/telegram";
import { PROVINCES } from "@/pipeline/province";

const provinceName = (slug: string) => PROVINCES.find((p) => p.slug === slug)?.displayName ?? slug;
const groupLabel = (slug: string) => findDirectoryGroup(slug)?.label ?? slug;

// Directory data layer: submissions, approval, sponsor leads, paid placements and public reads.
// Not a server action module: admin functions must only be called behind requireAdmin().
// Public reads select PUBLIC_PROFILE_COLUMNS only and always filter blocked tax codes (hidden or takedown).

export const RATE_LIMIT_PER_DAY = 5;
export const PROFILES_PAGE_SIZE = 20;
export const INDEXABLE_MIN_PROFILES = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export const TAKEDOWN_PAGE = "/yeu-cau-go-thong-tin";
const BLOCKED_MESSAGE =
  `Doanh nghiệp này đang được ẩn hoặc đang có yêu cầu gỡ thông tin nên chưa thể đăng hồ sơ. ` +
  `Nếu cần hỗ trợ, vui lòng xem trang ${TAKEDOWN_PAGE}.`;
const RATE_LIMIT_MESSAGE = "Bạn đã gửi quá nhiều lần trong 24 giờ qua. Vui lòng thử lại sau.";
const TURNSTILE_MESSAGE = "Không xác minh được bạn không phải máy tự động. Vui lòng tải lại trang và thử lại.";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string; errors?: FieldErrors };

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type LeadStatus = "NEW" | "CALLED" | "WON" | "LOST";
const LEAD_STATUSES: readonly LeadStatus[] = ["NEW", "CALLED", "WON", "LOST"];

export type PublicProfile = {
  mst: string;
  companyName: string;
  address: string;
  provinceSlug: string;
  groupSlug: string;
  description: string;
  services: ServiceItem[];
  publicPhone: string | null;
  publicZalo: string | null;
  website: string | null;
  publicEmail: string | null;
  logoUrl: string | null;
  approvedAt: Date;
  updatedAt: Date;
};

export type ActivePlacement = PublicProfile & { placementId: string; position: number; startsAt: Date; endsAt: Date };

/** Full row, admin only (contains the submitter's private contact). */
export type SubmissionRow = Omit<PublicProfile, "logoUrl" | "approvedAt" | "updatedAt"> & {
  id: string;
  consentPublish: boolean;
  submitterName: string;
  submitterRole: string;
  submitterPhone: string;
  confirmAuthority: boolean;
  status: SubmissionStatus;
  rejectReason: string | null;
  nameMatchesRegistry: boolean | null;
  createdAt: Date;
  reviewedAt: Date | null;
};

export type SponsorLeadRow = {
  id: string;
  contactName: string;
  phone: string;
  mst: string | null;
  groupSlug: string;
  provinceSlug: string;
  message: string | null;
  status: LeadStatus;
  createdAt: Date;
};

export type PlacementRow = {
  id: string;
  mst: string;
  groupSlug: string;
  provinceSlug: string;
  position: number;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  createdAt: Date;
};

// Explicit list: never p.* (keeps private columns out even if they are added to the table later).
export const PUBLIC_PROFILE_COLUMNS = `
  p.mst, p.company_name AS "companyName", p.address, p.province_slug AS "provinceSlug",
  p.group_slug AS "groupSlug", p.description, p.services, p.public_phone AS "publicPhone",
  p.public_zalo AS "publicZalo", p.website, p.public_email AS "publicEmail", p.logo_url AS "logoUrl",
  p.approved_at AS "approvedAt", p.updated_at AS "updatedAt"`;

/** SQL condition: the tax code in `col` is neither hidden nor under a pending/approved takedown request. */
const notBlocked = (col: string) => `
  NOT EXISTS (SELECT 1 FROM "Company" c WHERE c."taxCode" = ${col} AND c."isHidden")
  AND NOT EXISTS (SELECT 1 FROM "RemovalRequest" r WHERE r."taxCode" = ${col} AND r.status IN ('PENDING', 'APPROVED'))`;

const SUBMISSION_COLUMNS = `
  id, mst, company_name AS "companyName", address, province_slug AS "provinceSlug", group_slug AS "groupSlug",
  description, services, public_phone AS "publicPhone", public_zalo AS "publicZalo", website,
  public_email AS "publicEmail", consent_publish AS "consentPublish", submitter_name AS "submitterName",
  submitter_role AS "submitterRole", submitter_phone AS "submitterPhone", confirm_authority AS "confirmAuthority",
  status::text AS status, reject_reason AS "rejectReason", name_matches_registry AS "nameMatchesRegistry",
  created_at AS "createdAt", reviewed_at AS "reviewedAt"`;

const PLACEMENT_COLUMNS = `
  id, mst, group_slug AS "groupSlug", province_slug AS "provinceSlug", position::int AS position,
  starts_at AS "startsAt", ends_at AS "endsAt", note, created_at AS "createdAt"`;

export type AntiSpam = { ip: string | null; turnstileToken: string | null | undefined; honeypot?: string | null };

export type DirectoryDeps = {
  sql: Sql;
  /** Existing one-MST enrichment (lib/enrich.ts ensureEnriched); fills the Company row when it is PENDING. */
  enrich: (mst: string) => Promise<unknown>;
  verifyTurnstile?: (token: string | null | undefined, ip: string | null) => Promise<boolean>;
  now?: () => Date;
};

export function createDirectory(deps: DirectoryDeps) {
  const { sql, enrich } = deps;
  const now = deps.now ?? (() => new Date());
  const checkTurnstile = deps.verifyTurnstile ?? verifyTurnstileDefault;

  async function isBlocked(mst: string, db: Sql = sql): Promise<boolean> {
    const rows = await db.query<{ ok: boolean }>(`SELECT (${notBlocked("$1")}) AS ok`, [mst]);
    return !rows[0].ok;
  }

  /** Shared gate for public forms. Returns an error result, "drop" for a bot, or null to continue. */
  async function antiSpam(table: "profile_submission" | "sponsor_lead", spam: AntiSpam, ipHash: string) {
    if (spam.honeypot && spam.honeypot.trim() !== "") return "drop" as const;
    if (!(await checkTurnstile(spam.turnstileToken, spam.ip))) return { ok: false as const, message: TURNSTILE_MESSAGE };
    const since = new Date(now().getTime() - DAY_MS).toISOString();
    const [{ n }] = await sql.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM ${table} WHERE ip_hash = $1 AND created_at > $2::timestamptz`,
      [ipHash, since],
    );
    if (n >= RATE_LIMIT_PER_DAY) return { ok: false as const, message: RATE_LIMIT_MESSAGE };
    return null;
  }

  // ---------------------------------------------------------------- public forms

  async function submitProfile(
    input: ProfileSubmissionInput & { honeypot?: string | null },
    ip: string | null,
    turnstileToken: string | null | undefined,
  ): Promise<Result<{ id: string | null }>> {
    const ipHash = hashIp(ip);
    const gate = await antiSpam("profile_submission", { ip, turnstileToken, honeypot: input.honeypot }, ipHash);
    // Bots get a success answer and nothing is stored.
    if (gate === "drop") return { ok: true, id: null };
    if (gate) return gate;

    const parsed = profileSubmissionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "Vui lòng kiểm tra lại các ô được đánh dấu.", errors: fieldErrors(parsed.error) };
    }
    const v = parsed.data;
    if (await isBlocked(v.mst)) return { ok: false, message: BLOCKED_MESSAGE, errors: { mst: BLOCKED_MESSAGE } };

    const id = randomUUID();
    await sql.query(
      `INSERT INTO profile_submission (
         id, mst, company_name, address, province_slug, group_slug, description, services,
         public_phone, public_zalo, website, public_email, consent_publish,
         submitter_name, submitter_role, submitter_phone, confirm_authority, ip_hash, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::timestamptz)
       RETURNING id`,
      [
        id, v.mst, v.companyName, v.address, v.provinceSlug, v.groupSlug, v.description, JSON.stringify(v.services),
        v.publicPhone, v.publicZalo, v.website, v.publicEmail, v.consentPublish,
        v.submitterName, v.submitterRole, v.submitterPhone, v.confirmAuthority, ipHash, now().toISOString(),
      ],
    );
    scheduleNotify(() =>
      buildProfileSubmissionMessage({
        companyName: v.companyName,
        mst: v.mst,
        groupLabel: groupLabel(v.groupSlug),
        provinceName: provinceName(v.provinceSlug),
        adminUrl: `${SITE_URL}/admin`,
      }),
    );
    return { ok: true, id };
  }

  async function createSponsorLead(
    input: SponsorLeadInput & { honeypot?: string | null },
    ip: string | null,
    turnstileToken: string | null | undefined,
  ): Promise<Result<{ id: string | null }>> {
    const ipHash = hashIp(ip);
    const gate = await antiSpam("sponsor_lead", { ip, turnstileToken, honeypot: input.honeypot }, ipHash);
    if (gate === "drop") return { ok: true, id: null };
    if (gate) return gate;

    const parsed = sponsorLeadSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "Vui lòng kiểm tra lại các ô được đánh dấu.", errors: fieldErrors(parsed.error) };
    }
    const v = parsed.data;
    const id = randomUUID();
    await sql.query(
      `INSERT INTO sponsor_lead (id, contact_name, phone, mst, group_slug, province_slug, message, ip_hash, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz) RETURNING id`,
      [id, v.contactName, v.phone, v.mst, v.groupSlug, v.provinceSlug, v.message, ipHash, now().toISOString()],
    );
    scheduleNotify(() =>
      buildSponsorLeadMessage({
        groupLabel: groupLabel(v.groupSlug),
        provinceName: provinceName(v.provinceSlug),
        mst: v.mst,
        adminUrl: `${SITE_URL}/admin`,
      }),
    );
    return { ok: true, id };
  }

  // ---------------------------------------------------------------- admin: submissions

  function listPendingSubmissions(): Promise<SubmissionRow[]> {
    return sql.query<SubmissionRow>(
      `SELECT ${SUBMISSION_COLUMNS} FROM profile_submission WHERE status = 'PENDING' ORDER BY created_at ASC`,
    );
  }

  async function approveSubmission(id: string): Promise<Result<{ nameMatchesRegistry: boolean | null; usedOfficial: boolean }>> {
    const [sub] = await sql.query<SubmissionRow>(
      `SELECT ${SUBMISSION_COLUMNS} FROM profile_submission WHERE id = $1 AND status = 'PENDING'`,
      [id],
    );
    if (!sub) return { ok: false, message: "Không tìm thấy hồ sơ đang chờ duyệt." };
    if (await isBlocked(sub.mst)) return { ok: false, message: "Doanh nghiệp đang bị ẩn hoặc có yêu cầu gỡ thông tin; không thể duyệt." };

    try {
      await enrich(sub.mst);
    } catch (err) {
      console.error(`[directory] enrichment failed for ${sub.mst}; approving with submitted values`, err);
    }
    const [official] = await sql.query<{ name: string | null; address: string | null }>(
      `SELECT name, address FROM "Company" WHERE "taxCode" = $1 AND NOT "isHidden"`,
      [sub.mst],
    );
    const officialName = official?.name ?? null;
    const officialAddress = official?.address ?? null;
    const nameMatchesRegistry = officialName === null ? null : normalizeName(officialName) === normalizeName(sub.companyName);
    const at = now().toISOString();

    const approved = await sql.transaction(async (tx) => {
      const updated = await tx.query(
        `UPDATE profile_submission SET status = 'APPROVED', reviewed_at = $2::timestamptz, name_matches_registry = $3
         WHERE id = $1 AND status = 'PENDING' RETURNING id`,
        [id, at, nameMatchesRegistry],
      );
      if (updated.length === 0) return false;
      // logo_url is admin-managed and survives re-approval.
      await tx.query(
        `INSERT INTO business_profile (
           mst, company_name, address, province_slug, group_slug, description, services,
           public_phone, public_zalo, website, public_email, source_submission_id, approved_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13::timestamptz,$13::timestamptz)
         ON CONFLICT (mst) DO UPDATE SET
           company_name = EXCLUDED.company_name, address = EXCLUDED.address,
           province_slug = EXCLUDED.province_slug, group_slug = EXCLUDED.group_slug,
           description = EXCLUDED.description, services = EXCLUDED.services,
           public_phone = EXCLUDED.public_phone, public_zalo = EXCLUDED.public_zalo,
           website = EXCLUDED.website, public_email = EXCLUDED.public_email,
           source_submission_id = EXCLUDED.source_submission_id,
           approved_at = EXCLUDED.approved_at, updated_at = EXCLUDED.updated_at
         RETURNING mst`,
        [
          sub.mst, officialName ?? sub.companyName, officialAddress ?? sub.address, sub.provinceSlug, sub.groupSlug,
          sub.description, JSON.stringify(sub.services), sub.publicPhone, sub.publicZalo, sub.website, sub.publicEmail,
          sub.id, at,
        ],
      );
      return true;
    });
    if (!approved) return { ok: false, message: "Hồ sơ đã được xử lý bởi người khác." };
    return { ok: true, nameMatchesRegistry, usedOfficial: officialName !== null };
  }

  async function rejectSubmission(id: string, reason: string): Promise<Result> {
    const r = (reason ?? "").trim();
    if (!r) return { ok: false, message: "Vui lòng nhập lý do từ chối." };
    if (r.length > 500) return { ok: false, message: "Lý do tối đa 500 ký tự." };
    const updated = await sql.query(
      `UPDATE profile_submission SET status = 'REJECTED', reject_reason = $2, reviewed_at = $3::timestamptz
       WHERE id = $1 AND status = 'PENDING' RETURNING id`,
      [id, r, now().toISOString()],
    );
    return updated.length ? { ok: true } : { ok: false, message: "Không tìm thấy hồ sơ đang chờ duyệt." };
  }

  // ---------------------------------------------------------------- admin: leads

  function listSponsorLeads(): Promise<SponsorLeadRow[]> {
    return sql.query<SponsorLeadRow>(
      `SELECT id, contact_name AS "contactName", phone, mst, group_slug AS "groupSlug", province_slug AS "provinceSlug",
              message, status::text AS status, created_at AS "createdAt"
       FROM sponsor_lead ORDER BY created_at DESC`,
    );
  }

  async function setLeadStatus(id: string, status: LeadStatus): Promise<Result> {
    if (!LEAD_STATUSES.includes(status)) return { ok: false, message: "Trạng thái không hợp lệ." };
    const updated = await sql.query(
      `UPDATE sponsor_lead SET status = $2::"SponsorLeadStatus" WHERE id = $1 RETURNING id`,
      [id, status],
    );
    return updated.length ? { ok: true } : { ok: false, message: "Không tìm thấy khách hàng tiềm năng." };
  }

  // ---------------------------------------------------------------- admin: placements

  async function createPlacement(input: PlacementInput): Promise<Result<{ id: string }>> {
    const parsed = placementSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Dữ liệu không hợp lệ.", errors: fieldErrors(parsed.error) };
    const v = parsed.data;
    if (await isBlocked(v.mst)) return { ok: false, message: "Doanh nghiệp đang bị ẩn hoặc có yêu cầu gỡ thông tin." };

    return sql.transaction(async (tx) => {
      // Serialize writers for this slot so two overlapping inserts cannot both pass the check.
      await tx.query(`SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(hashtext($1))) l`, [
        `placement:${v.groupSlug}:${v.provinceSlug}:${v.position}`,
      ]);
      const clash = await tx.query<PlacementRow>(
        `SELECT ${PLACEMENT_COLUMNS} FROM featured_placement
         WHERE group_slug = $1 AND province_slug = $2 AND position = $3
           AND starts_at < $5::timestamptz AND $4::timestamptz < ends_at
         ORDER BY starts_at LIMIT 1`,
        [v.groupSlug, v.provinceSlug, v.position, v.startsAt.toISOString(), v.endsAt.toISOString()],
      );
      if (clash.length) {
        const c = clash[0];
        const d = (x: Date) => x.toISOString().slice(0, 10);
        return {
          ok: false as const,
          message:
            `Vị trí ${v.position} của ngành/tỉnh này đã có MST ${c.mst} từ ${d(c.startsAt)} đến ${d(c.endsAt)}. ` +
            `Chọn vị trí khác hoặc khoảng thời gian không trùng.`,
        };
      }
      const id = randomUUID();
      await tx.query(
        `INSERT INTO featured_placement (id, mst, group_slug, province_slug, position, starts_at, ends_at, note, created_at)
         VALUES ($1,$2,$3,$4,$5,$6::timestamptz,$7::timestamptz,$8,$9::timestamptz) RETURNING id`,
        [id, v.mst, v.groupSlug, v.provinceSlug, v.position, v.startsAt.toISOString(), v.endsAt.toISOString(), v.note, now().toISOString()],
      );
      return { ok: true as const, id };
    });
  }

  function listPlacements(): Promise<PlacementRow[]> {
    return sql.query<PlacementRow>(
      `SELECT ${PLACEMENT_COLUMNS} FROM featured_placement
       ORDER BY group_slug, province_slug, position, starts_at DESC`,
    );
  }

  // ---------------------------------------------------------------- public reads

  /** Paid slots live at `at`, only for businesses with an approved profile. */
  function getActivePlacements(groupSlug: string, provinceSlug: string, at: Date = now()): Promise<ActivePlacement[]> {
    return sql.query<ActivePlacement>(
      `SELECT ${PUBLIC_PROFILE_COLUMNS}, fp.id AS "placementId", fp.position::int AS position,
              fp.starts_at AS "startsAt", fp.ends_at AS "endsAt"
       FROM featured_placement fp
       JOIN business_profile p ON p.mst = fp.mst
       WHERE fp.group_slug = $1 AND fp.province_slug = $2
         AND fp.starts_at <= $3::timestamptz AND $3::timestamptz < fp.ends_at
         AND ${notBlocked("fp.mst")}
       ORDER BY fp.position`,
      [groupSlug, provinceSlug, at.toISOString()],
    );
  }

  function listProfiles(groupSlug: string, provinceSlug: string, page = 1): Promise<PublicProfile[]> {
    const p = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    return sql.query<PublicProfile>(
      `SELECT ${PUBLIC_PROFILE_COLUMNS} FROM business_profile p
       WHERE p.group_slug = $1 AND p.province_slug = $2 AND ${notBlocked("p.mst")}
       ORDER BY p.approved_at DESC, p.mst
       LIMIT $3 OFFSET $4`,
      [groupSlug, provinceSlug, PROFILES_PAGE_SIZE, (p - 1) * PROFILES_PAGE_SIZE],
    );
  }

  async function countProfiles(groupSlug: string, provinceSlug: string): Promise<number> {
    const [{ n }] = await sql.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM business_profile p
       WHERE p.group_slug = $1 AND p.province_slug = $2 AND ${notBlocked("p.mst")}`,
      [groupSlug, provinceSlug],
    );
    return n;
  }

  async function getProfile(mst: string): Promise<PublicProfile | null> {
    const parsed = mstSchema.safeParse(mst);
    if (!parsed.success) return null;
    const [row] = await sql.query<PublicProfile>(
      `SELECT ${PUBLIC_PROFILE_COLUMNS} FROM business_profile p WHERE p.mst = $1 AND ${notBlocked("p.mst")}`,
      [parsed.data],
    );
    return row ?? null;
  }

  /** A group × province page is only indexable with enough approved, visible profiles. */
  async function isIndexable(groupSlug: string, provinceSlug: string): Promise<boolean> {
    return (await countProfiles(groupSlug, provinceSlug)) >= INDEXABLE_MIN_PROFILES;
  }

  return {
    submitProfile,
    createSponsorLead,
    listPendingSubmissions,
    approveSubmission,
    rejectSubmission,
    listSponsorLeads,
    setLeadStatus,
    createPlacement,
    listPlacements,
    getActivePlacements,
    listProfiles,
    countProfiles,
    getProfile,
    isIndexable,
  };
}

export type Directory = ReturnType<typeof createDirectory>;
