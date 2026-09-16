"use server";

import { headers } from "next/headers";
import { createSponsorLead } from "@/lib/directory";

export type LeadFieldErrors = Record<string, string>;
export type LeadFormState = { ok: boolean; submitted: boolean; message?: string; errors: LeadFieldErrors };

export const INITIAL_LEAD_STATE: LeadFormState = { ok: false, submitted: false, errors: {} };

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? null;
}

export async function submitSponsorLeadAction(_prev: LeadFormState, fd: FormData): Promise<LeadFormState> {
  const ip = await clientIp();
  const turnstileToken = text(fd, "cf-turnstile-response") || null;

  const input = {
    contactName: text(fd, "contactName"),
    phone: text(fd, "phone"),
    mst: text(fd, "mst"),
    groupSlug: text(fd, "groupSlug"),
    provinceSlug: text(fd, "provinceSlug"),
    message: text(fd, "message"),
    // Honeypot: real visitors never see or fill this field (see SponsorForm.tsx).
    honeypot: text(fd, "hp_company"),
  };

  const result = await createSponsorLead(input, ip, turnstileToken);
  if (!result.ok) return { ok: false, submitted: false, message: result.message, errors: result.errors ?? {} };
  return { ok: true, submitted: true, errors: {} };
}
