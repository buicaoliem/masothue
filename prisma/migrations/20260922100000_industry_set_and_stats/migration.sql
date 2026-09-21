-- Additive: three new tables. CompanyIndustry (43,944 rows) and Company are not touched.
-- Impact: CREATE TABLE/INDEX on empty tables; no locks on existing data.

CREATE TABLE "CompanyIndustrySet" (
  "companyId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "codes" TEXT[] NOT NULL,
  "sourceUpdatedAt" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyIndustrySet_pkey" PRIMARY KEY ("companyId", "source"),
  CONSTRAINT "CompanyIndustrySet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CompanyIndustrySet_codes_idx" ON "CompanyIndustrySet" USING GIN ("codes");

CREATE TABLE "IndustryStat" (
  "code" TEXT NOT NULL,
  "companyCount" INTEGER NOT NULL,
  "primaryCount" INTEGER NOT NULL,
  "registeredCount" INTEGER NOT NULL,
  "provinceCount" INTEGER NOT NULL,
  "sourceCount" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IndustryStat_pkey" PRIMARY KEY ("code")
);
CREATE INDEX "IndustryStat_companyCount_idx" ON "IndustryStat"("companyCount");

CREATE TABLE "ProvinceIndustryStat" (
  "provinceSlug" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "companyCount" INTEGER NOT NULL,
  "primaryCount" INTEGER NOT NULL,
  "registeredCount" INTEGER NOT NULL,
  "provinceCompanyCount" INTEGER NOT NULL,
  "provinceIndustryCompanyCount" INTEGER NOT NULL,
  "saturationRatio" DOUBLE PRECISION NOT NULL,
  "sourceCount" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProvinceIndustryStat_pkey" PRIMARY KEY ("provinceSlug", "code")
);
CREATE INDEX "ProvinceIndustryStat_code_idx" ON "ProvinceIndustryStat"("code");
