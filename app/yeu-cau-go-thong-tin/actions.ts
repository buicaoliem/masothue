"use server";

import type { RequesterRelation } from "@prisma/client";
import { prisma } from "@/pipeline/db";
import { getCompanyNameForRequest, TAX_CODE_RE } from "@/lib/company";
import { buildRemovalRequestMessage, scheduleNotify } from "@/lib/notify/telegram";
import { SITE_URL } from "@/lib/site";

export type FieldName = "taxCode" | "reason" | "contactEmail" | "requesterName" | "requesterRelation";
export type SubmitState = { ok: boolean; errors: Partial<Record<FieldName, string>> };

const RELATIONS: RequesterRelation[] = ["OWNER", "REPRESENTATIVE", "OTHER"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REASON_MIN = 10;
const REASON_MAX = 2000;

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export async function lookupCompanyName(taxCode: string): Promise<string | null> {
  return getCompanyNameForRequest(taxCode.replace(/\s+/g, ""));
}

/** Stores one PENDING RemovalRequest. Never hides anything and sends no email. */
export async function submitRemovalRequest(_prev: SubmitState, fd: FormData): Promise<SubmitState> {
  // Honeypot: humans never see this field. Answer as if saved so bots learn nothing.
  if (text(fd, "website")) return { ok: true, errors: {} };

  const taxCode = text(fd, "taxCode").replace(/\s+/g, "");
  const reason = text(fd, "reason");
  const contactEmail = text(fd, "contactEmail");
  const requesterName = text(fd, "requesterName");
  const relation = text(fd, "requesterRelation");

  const errors: SubmitState["errors"] = {};
  if (!TAX_CODE_RE.test(taxCode)) errors.taxCode = "Mã số thuế gồm 10 chữ số (hoặc 10 chữ số kèm -XXX cho chi nhánh).";
  if (reason.length < REASON_MIN) errors.reason = `Vui lòng mô tả lý do (ít nhất ${REASON_MIN} ký tự).`;
  else if (reason.length > REASON_MAX) errors.reason = `Lý do tối đa ${REASON_MAX} ký tự.`;
  if (contactEmail.length > 254 || !EMAIL_RE.test(contactEmail)) errors.contactEmail = "Email liên hệ không hợp lệ.";
  if (requesterName.length > 120) errors.requesterName = "Tên tối đa 120 ký tự.";
  if (relation && !RELATIONS.includes(relation as RequesterRelation)) errors.requesterRelation = "Lựa chọn không hợp lệ.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  await prisma.removalRequest.create({
    data: {
      taxCode,
      reason,
      contactEmail,
      requesterName: requesterName || null,
      requesterRelation: (relation as RequesterRelation) || null,
    },
  });
  scheduleNotify(async () => {
    const companyName = await getCompanyNameForRequest(taxCode).catch(() => null);
    return buildRemovalRequestMessage({ taxCode, companyName, adminUrl: `${SITE_URL}/admin` });
  });
  return { ok: true, errors: {} };
}
