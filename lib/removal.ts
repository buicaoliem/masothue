import type { Sql } from "./directory/sql";
import { prismaSql } from "./directory/sql";
import { prisma } from "@/pipeline/db";

// Admin review for /yeu-cau-go-thong-tin submissions. Runs through the same injectable Sql
// interface as lib/directory/service.ts so tests can run it against PGlite. Approving hides the
// company (Company.isHidden = true) in the same transaction as the status change, so the two
// never drift apart. RemovalRequest has no rejectReason column (no schema change in this task);
// rejecting only records the status.

export type PendingRemovalRow = {
  id: string;
  taxCode: string;
  companyName: string | null;
  reason: string;
  contactEmail: string;
  requesterName: string | null;
  requesterRelation: string | null;
  createdAt: Date;
};

export type RemovalResult = { ok: true } | { ok: false; message: string };

export function createRemovalService(sql: Sql) {
  function listPendingRemovals(): Promise<PendingRemovalRow[]> {
    return sql.query<PendingRemovalRow>(
      `SELECT r.id, r."taxCode", c.name AS "companyName", r.reason, r."contactEmail",
              r."requesterName", r."requesterRelation"::text AS "requesterRelation", r."createdAt"
       FROM "RemovalRequest" r LEFT JOIN "Company" c ON c."taxCode" = r."taxCode"
       WHERE r.status = 'PENDING' ORDER BY r."createdAt" ASC`,
    );
  }

  /** Approves the request and hides the company atomically; returns the tax code for cache revalidation. */
  async function approveRemoval(id: string): Promise<RemovalResult & { taxCode?: string }> {
    return sql.transaction(async (tx) => {
      const updated = await tx.query<{ taxCode: string }>(
        `UPDATE "RemovalRequest" SET status = 'APPROVED' WHERE id = $1 AND status = 'PENDING' RETURNING "taxCode"`,
        [id],
      );
      if (updated.length === 0) return { ok: false, message: "Không tìm thấy yêu cầu đang chờ duyệt." };
      const taxCode = updated[0].taxCode;
      await tx.query(`UPDATE "Company" SET "isHidden" = true WHERE "taxCode" = $1`, [taxCode]);
      return { ok: true, taxCode };
    });
  }

  async function rejectRemoval(id: string, reason: string): Promise<RemovalResult> {
    if (!reason.trim()) return { ok: false, message: "Vui lòng nhập lý do từ chối." };
    const updated = await sql.query(
      `UPDATE "RemovalRequest" SET status = 'REJECTED' WHERE id = $1 AND status = 'PENDING' RETURNING id`,
      [id],
    );
    return updated.length ? { ok: true } : { ok: false, message: "Không tìm thấy yêu cầu đang chờ duyệt." };
  }

  return { listPendingRemovals, approveRemoval, rejectRemoval };
}

export const removalService = createRemovalService(prismaSql(prisma));
export const { listPendingRemovals, approveRemoval, rejectRemoval } = removalService;
