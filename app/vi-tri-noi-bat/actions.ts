"use server";

import { clientIp, createSponsorLead } from "@/lib/directory";
import type { LeadFormState } from "./formState";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

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
