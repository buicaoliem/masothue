"use server";

import { headers } from "next/headers";
import { submitProfile } from "@/lib/directory";
import { SERVICES_MAX } from "@/lib/directory/validation";
import type { ProfileFormState } from "./formState";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

/** First value of x-forwarded-for, trimmed; null when absent (e.g. local dev without a proxy). */
async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? null;
}

function parseServices(raw: string): { name: string; detail: string }[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(0, SERVICES_MAX)
      .map((s) => ({ name: String(s?.name ?? ""), detail: String(s?.detail ?? "") }))
      .filter((s) => s.name.trim() !== "");
  } catch {
    return [];
  }
}

export async function submitProfileAction(_prev: ProfileFormState, fd: FormData): Promise<ProfileFormState> {
  const ip = await clientIp();
  const turnstileToken = text(fd, "cf-turnstile-response") || null;

  const input = {
    mst: text(fd, "mst"),
    companyName: text(fd, "companyName"),
    address: text(fd, "address"),
    provinceSlug: text(fd, "provinceSlug"),
    groupSlug: text(fd, "groupSlug"),
    description: text(fd, "description"),
    services: parseServices(text(fd, "servicesJson")),
    publicPhone: text(fd, "publicPhone"),
    publicZalo: text(fd, "publicZalo"),
    website: text(fd, "website"),
    publicEmail: text(fd, "publicEmail"),
    consentPublish: text(fd, "consentPublish") === "on",
    submitterName: text(fd, "submitterName"),
    submitterRole: text(fd, "submitterRole"),
    submitterPhone: text(fd, "submitterPhone"),
    confirmAuthority: text(fd, "confirmAuthority") === "on",
    // Honeypot: real visitors never see or fill this field (see ProfileForm.tsx).
    honeypot: text(fd, "hp_company"),
  };

  const result = await submitProfile(input, ip, turnstileToken);
  if (!result.ok) return { ok: false, submitted: false, message: result.message, errors: result.errors ?? {} };
  return { ok: true, submitted: true, errors: {} };
}
