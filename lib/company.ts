import { cache } from "react";
import { prisma } from "@/pipeline/db";
import { VietqrSource } from "@/pipeline/sources/vietqr";
import { SourceTransportError } from "@/pipeline/sources/types";

// Only public business fields leave this module. No phone/email/personal IDs.
const PUBLIC_SELECT = {
  taxCode: true,
  name: true,
  address: true,
  province: true,
  status: true,
  representativeName: true,
  mainIndustry: true,
  enrichStatus: true,
} as const;

// 10 digits, optionally a 3-digit branch suffix (0100111948-001).
const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;

const vietqr = new VietqrSource();

/**
 * Read a company by tax code. PENDING rows are enriched once from vietqr and
 * persisted; OK / SOURCE_MISS rows are served straight from the store.
 * Merge rule: only non-null source values are written, existing values are never blanked.
 */
export const getCompany = cache(async (taxCode: string) => {
  if (!TAX_CODE_RE.test(taxCode)) return null;

  const company = await prisma.company.findUnique({ where: { taxCode }, select: PUBLIC_SELECT });
  if (!company || company.enrichStatus !== "PENDING") return company;

  let result;
  try {
    result = await vietqr.fetchByTaxCode(taxCode);
  } catch (err) {
    // Transient failure: keep PENDING so the next visit retries.
    if (err instanceof SourceTransportError) return company;
    throw err;
  }

  if (result.kind === "SOURCE_MISS") {
    return prisma.company.update({
      where: { taxCode },
      data: { enrichStatus: "SOURCE_MISS", lastEnrichedAt: new Date() },
      select: PUBLIC_SELECT,
    });
  }

  const { name, address, province, status } = result.data;
  const fill = Object.fromEntries(
    Object.entries({ name, address, province, status }).filter(([, v]) => v !== null),
  );
  return prisma.company.update({
    where: { taxCode },
    data: { ...fill, enrichStatus: "OK", lastEnrichedAt: new Date() },
    select: PUBLIC_SELECT,
  });
});
