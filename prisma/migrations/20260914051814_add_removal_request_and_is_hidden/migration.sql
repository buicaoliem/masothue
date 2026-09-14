-- CreateEnum
CREATE TYPE "RequesterRelation" AS ENUM ('OWNER', 'REPRESENTATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "RemovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RemovalRequest" (
    "id" TEXT NOT NULL,
    "taxCode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "requesterName" TEXT,
    "requesterRelation" "RequesterRelation",
    "status" "RemovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RemovalRequest_status_createdAt_idx" ON "RemovalRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RemovalRequest_taxCode_idx" ON "RemovalRequest"("taxCode");
