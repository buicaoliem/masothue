-- Additive migration: no data is dropped or rewritten.
-- Impact: CREATE INDEX statements take a short write lock on "Company" (~2M rows, seconds each).

-- CompanyIndustry: provenance + timestamps. Existing rows (none in production) get createdAt/updatedAt = now.
ALTER TABLE "CompanyIndustry"
  ADD COLUMN "source" TEXT,
  ADD COLUMN "sourceUpdatedAt" DATE,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- (code, companyId) serves "companies in industry X" and supersedes the single-column code index.
DROP INDEX IF EXISTS "CompanyIndustry_code_idx";
CREATE INDEX "CompanyIndustry_code_companyId_idx" ON "CompanyIndustry"("code", "companyId");

-- At most one primary industry per company (not expressible in the Prisma schema).
CREATE UNIQUE INDEX "CompanyIndustry_one_primary_per_company" ON "CompanyIndustry"("companyId") WHERE "isPrimary";

-- Canonical industry reference.
CREATE TABLE "IndustryCatalog" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "parentCode" TEXT,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IndustryCatalog_pkey" PRIMARY KEY ("code")
);
CREATE INDEX "IndustryCatalog_parentCode_idx" ON "IndustryCatalog"("parentCode");

-- Company: record freshness + indexes that back the taxonomy hubs.
ALTER TABLE "Company" ADD COLUMN "dataUpdatedAt" TIMESTAMP(3);
CREATE INDEX "Company_provinceSlug_taxCode_idx" ON "Company"("provinceSlug", "taxCode");
CREATE INDEX "Company_legalType_idx" ON "Company"("legalType");
CREATE INDEX "Company_activeDate_idx" ON "Company"("activeDate");
