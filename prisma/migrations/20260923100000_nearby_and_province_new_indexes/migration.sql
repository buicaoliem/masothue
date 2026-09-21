-- EXPLAIN (ANALYZE, BUFFERS) showed the company page's "nearby" query scanning ~190k HCM rows (24k buffers, ~180 ms)
-- to sort by updatedAt, and the province "new companies" module doing the same over activeDate.
-- Partial indexes over the listable rows only (~10% of "Company"), so these become index range reads.
-- Additive; not expressible in schema.prisma (like the other partial indexes). Short CREATE INDEX over ~204k rows.
CREATE INDEX "Company_listable_province_updatedAt_idx" ON "Company"("provinceSlug", "updatedAt" DESC)
  WHERE "enrichStatus" = 'OK' AND "isHidden" = false;
CREATE INDEX "Company_listable_province_activeDate_idx" ON "Company"("provinceSlug", "activeDate" DESC, "taxCode" DESC)
  WHERE "enrichStatus" = 'OK' AND "isHidden" = false AND "activeDate" IS NOT NULL;
