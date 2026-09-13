import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { BusinessSource } from "./sources/types";

/**
 * Fetch one tax code from a source and upsert it.
 * SOURCE_MISS keeps the row (creating a bare taxCode row if needed) and never
 * overwrites data previously obtained from another source.
 */
export async function enrichTaxCode(source: BusinessSource, taxCode: string) {
  const result = await source.fetchByTaxCode(taxCode);
  const now = new Date();

  if (result.kind === "SOURCE_MISS") {
    return prisma.company.upsert({
      where: { taxCode },
      create: { taxCode, enrichStatus: "SOURCE_MISS", lastEnrichedAt: now },
      update: { lastEnrichedAt: now },
    });
  }

  const { taxCode: _ignored, capital, ...fields } = result.data;
  const data = {
    ...fields,
    capital: capital === null ? null : new Prisma.Decimal(capital),
    enrichStatus: "OK" as const,
    lastEnrichedAt: now,
  };
  return prisma.company.upsert({
    where: { taxCode },
    create: { taxCode, ...data },
    update: data,
  });
}
