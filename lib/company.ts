import { cache } from "react";
import { prisma } from "@/pipeline/db";
import { provinceFromAddress } from "@/pipeline/province";
import { VietqrSource } from "@/pipeline/sources/vietqr";
import { SourceTransportError } from "@/pipeline/sources/types";

// Only public business fields leave this module. No phone/email/personal IDs.
const PUBLIC_SELECT = {
  taxCode: true,
  name: true,
  address: true,
  province: true,
  provinceSlug: true,
  status: true,
  activeDate: true,
  representativeName: true,
  mainIndustry: true,
  enrichStatus: true,
} as const;

// 10 digits, optionally a 3-digit branch suffix (0100111948-001).
const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;

const vietqr = new VietqrSource();

export class EnrichUnavailableError extends Error {}

type PublicCompany = NonNullable<Awaited<ReturnType<typeof findCompany>>>;
type ShowableCompany = PublicCompany & { name: string; address: string };

function findCompany(taxCode: string) {
  return prisma.company.findUnique({ where: { taxCode }, select: PUBLIC_SELECT });
}

/** A page is only worth rendering with at least a name and an address. */
function showable(c: PublicCompany | null): ShowableCompany | null {
  return c?.name && c.address ? (c as ShowableCompany) : null;
}

/**
 * Read a company by tax code; null means "render 404".
 * PENDING rows are enriched once from vietqr and persisted; other rows are served from the store.
 * Merge rule: only non-null values are written, existing values are never blanked.
 * A transport failure throws EnrichUnavailableError and leaves the row PENDING for the next visit.
 */
export const getCompany = cache(async (taxCode: string): Promise<ShowableCompany | null> => {
  if (!TAX_CODE_RE.test(taxCode)) return null;

  const company = await findCompany(taxCode);
  if (!company || company.enrichStatus !== "PENDING") return showable(company);

  let result;
  try {
    result = await vietqr.fetchByTaxCode(taxCode);
  } catch (err) {
    if (err instanceof SourceTransportError) throw new EnrichUnavailableError(err.message);
    throw err;
  }

  const fetched = result.kind === "OK" ? result.data : null;
  const address = company.address ?? fetched?.address ?? null;
  const province = provinceFromAddress(address);
  const candidate = {
    name: company.name ?? fetched?.name ?? null,
    address,
    status: company.status ?? fetched?.status ?? null,
    province: province?.displayName ?? null,
    provinceSlug: province?.slug ?? null,
  };
  const fill = Object.fromEntries(Object.entries(candidate).filter(([, v]) => v !== null));

  const updated = await prisma.company.update({
    where: { taxCode },
    data: {
      ...fill,
      enrichStatus: candidate.name && candidate.address ? "OK" : "SOURCE_MISS",
      lastEnrichedAt: new Date(),
    },
    select: PUBLIC_SELECT,
  });
  return showable(updated);
});

/** Up to `limit` other enriched companies in the same province, for the "nearby" block. */
export async function getNearbyCompanies(provinceSlug: string | null, excludeTaxCode: string, limit = 5) {
  if (!provinceSlug) return [];
  return prisma.company.findMany({
    where: {
      provinceSlug,
      enrichStatus: "OK",
      name: { not: null },
      address: { not: null },
      taxCode: { not: excludeTaxCode },
    },
    select: { taxCode: true, name: true, address: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  }) as Promise<{ taxCode: string; name: string; address: string }[]>;
}
