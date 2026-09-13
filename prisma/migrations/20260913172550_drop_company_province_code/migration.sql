/*
  Warnings:

  - You are about to drop the column `provinceCode` on the `Company` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Company_provinceCode_idx";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "provinceCode";
