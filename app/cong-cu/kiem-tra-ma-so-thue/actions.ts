"use server";

import { findCompanyForLookup } from "@/lib/company";
import { validateMst } from "@/lib/tools/mst";

export type MstCheckResult =
  | { kind: "invalid"; reason: string }
  | { kind: "not_in_directory"; taxCode: string }
  | { kind: "found"; taxCode: string; name: string | null; enrichStatus: "PENDING" | "OK" | "SOURCE_MISS" };

export async function checkMst(raw: string): Promise<MstCheckResult> {
  const validation = validateMst(raw);
  if (!validation.valid) return { kind: "invalid", reason: validation.reason };

  const company = await findCompanyForLookup(validation.normalized);
  if (!company) return { kind: "not_in_directory", taxCode: validation.normalized };

  return { kind: "found", taxCode: validation.normalized, name: company.name, enrichStatus: company.enrichStatus };
}
