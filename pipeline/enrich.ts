import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { BusinessSource, CompanyData } from "./sources/types";

/**
 * Columns to WRITE from a fetch. A field the source did not return (null/undefined) is left out
 * entirely, so a thinner response can never erase data an earlier, better source provided.
 * The provider has no way to signal an explicit removal, so nothing here ever sets a column to null.
 * dataUpdatedAt is not touched: a refresh may return identical data, and lastmod must not move for that.
 */
export function buildEnrichUpdate(fetched: CompanyData, now: Date) {
  const { taxCode: _taxCode, capital, ...fields } = fetched; // eslint-disable-line @typescript-eslint/no-unused-vars
  const present = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined)) as Partial<typeof fields>;
  return {
    ...present,
    ...(capital !== null && capital !== undefined ? { capital: new Prisma.Decimal(capital) } : {}),
    enrichStatus: "OK" as const,
    lastEnrichedAt: now,
  };
}

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

  const data = buildEnrichUpdate(result.data, now);
  return prisma.company.upsert({
    where: { taxCode },
    create: { taxCode, ...data },
    update: data,
  });
}
