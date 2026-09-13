-- CreateEnum
CREATE TYPE "EnrichStatus" AS ENUM ('PENDING', 'OK', 'SOURCE_MISS');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "taxCode" TEXT NOT NULL,
    "name" TEXT,
    "nameForeign" TEXT,
    "nameShort" TEXT,
    "address" TEXT,
    "provinceCode" TEXT,
    "province" TEXT,
    "district" TEXT,
    "ward" TEXT,
    "status" TEXT,
    "activeDate" DATE,
    "legalType" TEXT,
    "taxOffice" TEXT,
    "representativeName" TEXT,
    "mainIndustryCode" TEXT,
    "mainIndustry" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "capital" DECIMAL(20,0),
    "enrichStatus" "EnrichStatus" NOT NULL DEFAULT 'PENDING',
    "lastEnrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyIndustry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CompanyIndustry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyChange" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,

    CONSTRAINT "CompanyChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Province" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "District" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provinceCode" TEXT NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "IngestCheckpoint" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "cursor" TEXT,
    "page" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_taxCode_key" ON "Company"("taxCode");

-- CreateIndex
CREATE INDEX "Company_provinceCode_idx" ON "Company"("provinceCode");

-- CreateIndex
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- CreateIndex
CREATE INDEX "Company_enrichStatus_idx" ON "Company"("enrichStatus");

-- CreateIndex
CREATE INDEX "CompanyIndustry_code_idx" ON "CompanyIndustry"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyIndustry_companyId_code_key" ON "CompanyIndustry"("companyId", "code");

-- CreateIndex
CREATE INDEX "CompanyChange_companyId_changedAt_idx" ON "CompanyChange"("companyId", "changedAt");

-- CreateIndex
CREATE INDEX "District_provinceCode_idx" ON "District"("provinceCode");

-- CreateIndex
CREATE UNIQUE INDEX "IngestCheckpoint_scope_key" ON "IngestCheckpoint"("scope");

-- AddForeignKey
ALTER TABLE "CompanyIndustry" ADD CONSTRAINT "CompanyIndustry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyChange" ADD CONSTRAINT "CompanyChange_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_provinceCode_fkey" FOREIGN KEY ("provinceCode") REFERENCES "Province"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
