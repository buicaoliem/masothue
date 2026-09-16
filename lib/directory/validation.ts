import { z } from "zod";
import { validateMst } from "@/lib/tools/mst";
import { PROVINCES } from "@/pipeline/province";
import { findDirectoryGroup } from "./groups";

// Input rules for the directory forms. Messages are shown to visitors, so they are plain Vietnamese.

export const DESCRIPTION_MAX = 300;
export const SERVICES_MAX = 6;
export const SERVICE_NAME_MAX = 60;
export const SERVICE_DETAIL_MAX = 120;

const PROVINCE_SLUGS = new Set(PROVINCES.map((p) => p.slug));

const trimmed = (max: number, label: string) =>
  z.string().trim().max(max, `${label} tối đa ${max} ký tự.`);
const required = (max: number, label: string) => trimmed(max, label).min(1, `Vui lòng nhập ${label.toLowerCase()}.`);

/** Empty strings become null so "not filled" has one representation. */
const optional = <T extends z.ZodType<string | null>>(inner: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v ?? null), inner.nullable());

/** 10 digits or 13 digits (with or without the dash), check digit verified. Normalized to 0123456789-001. */
export const mstSchema = z.string().transform((raw, ctx) => {
  const r = validateMst(raw);
  if (!r.valid) {
    ctx.addIssue({ code: "custom", message: r.reason });
    return z.NEVER;
  }
  return r.normalized;
});

/** Vietnamese phone: 0xxxxxxxxx or +84xxxxxxxxx; spaces, dots and dashes are ignored. Stored as 0xxxxxxxxx. */
const phoneSchema = z.string().transform((raw, ctx) => {
  const digits = raw.replace(/[\s.\-()]/g, "").replace(/^\+84/, "0");
  if (!/^0\d{9,10}$/.test(digits)) {
    ctx.addIssue({ code: "custom", message: "Số điện thoại không hợp lệ." });
    return z.NEVER;
  }
  return digits;
});

const websiteSchema = z.string().trim().max(200, "Website tối đa 200 ký tự.").transform((raw, ctx) => {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) throw new Error();
    return u.toString();
  } catch {
    ctx.addIssue({ code: "custom", message: "Địa chỉ website không hợp lệ." });
    return z.NEVER;
  }
});

const emailSchema = z.string().trim().max(254).email("Email không hợp lệ.").transform((s) => s.toLowerCase());

const provinceSlugSchema = z.string().refine((s) => PROVINCE_SLUGS.has(s), "Vui lòng chọn tỉnh/thành phố.");
const groupSlugSchema = z.string().refine((s) => findDirectoryGroup(s) !== null, "Vui lòng chọn ngành.");

export const serviceSchema = z.object({
  name: required(SERVICE_NAME_MAX, "Tên dịch vụ"),
  detail: trimmed(SERVICE_DETAIL_MAX, "Mô tả dịch vụ").default(""),
});
export type ServiceItem = z.infer<typeof serviceSchema>;

const checkbox = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());

export const profileSubmissionSchema = z
  .object({
    mst: mstSchema,
    companyName: required(200, "Tên doanh nghiệp"),
    address: required(300, "Địa chỉ"),
    provinceSlug: provinceSlugSchema,
    groupSlug: groupSlugSchema,
    description: required(DESCRIPTION_MAX, "Giới thiệu"),
    services: z.array(serviceSchema).max(SERVICES_MAX, `Tối đa ${SERVICES_MAX} dịch vụ.`).default([]),
    publicPhone: optional(phoneSchema),
    publicZalo: optional(phoneSchema),
    website: optional(websiteSchema),
    publicEmail: optional(emailSchema),
    consentPublish: checkbox,
    submitterName: required(120, "Họ tên người gửi"),
    submitterRole: required(60, "Chức vụ"),
    submitterPhone: phoneSchema,
    confirmAuthority: checkbox.refine((v) => v, "Vui lòng xác nhận bạn có quyền đăng thông tin doanh nghiệp này."),
  })
  .superRefine((v, ctx) => {
    const hasContact = [v.publicPhone, v.publicZalo, v.website, v.publicEmail].some((x) => x !== null);
    if (hasContact && !v.consentPublish) {
      ctx.addIssue({
        code: "custom",
        path: ["consentPublish"],
        message: "Vui lòng đồng ý công khai thông tin liên hệ đã nhập.",
      });
    }
  });
/** Raw form values; optional contact fields may be empty strings. */
export type ProfileSubmissionInput = {
  mst: string;
  companyName: string;
  address: string;
  provinceSlug: string;
  groupSlug: string;
  description: string;
  services?: { name: string; detail?: string }[];
  publicPhone?: string | null;
  publicZalo?: string | null;
  website?: string | null;
  publicEmail?: string | null;
  consentPublish: boolean | string;
  submitterName: string;
  submitterRole: string;
  submitterPhone: string;
  confirmAuthority: boolean | string;
};
export type ProfileSubmissionData = z.output<typeof profileSubmissionSchema>;

export const sponsorLeadSchema = z.object({
  contactName: required(120, "Họ tên"),
  phone: phoneSchema,
  mst: optional(mstSchema),
  groupSlug: groupSlugSchema,
  provinceSlug: provinceSlugSchema,
  message: optional(trimmed(1000, "Lời nhắn")),
});
export type SponsorLeadInput = {
  contactName: string;
  phone: string;
  mst?: string | null;
  groupSlug: string;
  provinceSlug: string;
  message?: string | null;
};

export const placementSchema = z
  .object({
    mst: mstSchema,
    groupSlug: groupSlugSchema,
    provinceSlug: provinceSlugSchema,
    position: z.coerce.number().int().min(1, "Vị trí từ 1 đến 3.").max(3, "Vị trí từ 1 đến 3."),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    note: optional(trimmed(500, "Ghi chú")),
  })
  .refine((v) => v.startsAt < v.endsAt, { path: ["endsAt"], message: "Ngày kết thúc phải sau ngày bắt đầu." });
export type PlacementInput = {
  mst: string;
  groupSlug: string;
  provinceSlug: string;
  position: number | string;
  startsAt: Date | string;
  endsAt: Date | string;
  note?: string | null;
};

export type FieldErrors = Record<string, string>;

/** First message per field, keyed by dotted path ("services.2.name"). */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}

/** Lowercase, no diacritics, đ → d, punctuation and extra spaces removed. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
