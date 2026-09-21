-- Only ~10% of Company rows are listable (enriched, visible), so the planner ignored the full-table
-- (provinceSlug, taxCode) and (activeDate) indexes and scanned the enrichStatus index instead.
-- Partial indexes over the listable rows are ~10x smaller and match the hub queries exactly.
-- Not expressible in schema.prisma (like the partial unique index on CompanyIndustry).
-- Impact: two short CREATE INDEX runs over "Company"; nothing is dropped except the two unused indexes.
DROP INDEX IF EXISTS "Company_provinceSlug_taxCode_idx";
DROP INDEX IF EXISTS "Company_activeDate_idx";
CREATE INDEX "Company_listable_province_taxCode_idx" ON "Company"("provinceSlug", "taxCode")
  WHERE "enrichStatus" = 'OK' AND "isHidden" = false;
CREATE INDEX "Company_listable_activeDate_idx" ON "Company"("activeDate" DESC, "taxCode" DESC)
  WHERE "enrichStatus" = 'OK' AND "isHidden" = false AND "activeDate" IS NOT NULL;
