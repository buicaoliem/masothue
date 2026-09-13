-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "provinceSlug" TEXT;

-- CreateIndex
CREATE INDEX "Company_provinceSlug_idx" ON "Company"("provinceSlug");
