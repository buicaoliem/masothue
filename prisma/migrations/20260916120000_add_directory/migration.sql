-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SponsorLeadStatus" AS ENUM ('NEW', 'CALLED', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "profile_submission" (
    "id" TEXT NOT NULL,
    "mst" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "province_slug" TEXT NOT NULL,
    "group_slug" TEXT NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "services" JSONB NOT NULL DEFAULT '[]',
    "public_phone" TEXT,
    "public_zalo" TEXT,
    "website" TEXT,
    "public_email" TEXT,
    "consent_publish" BOOLEAN NOT NULL,
    "submitter_name" TEXT NOT NULL,
    "submitter_role" TEXT NOT NULL,
    "submitter_phone" TEXT NOT NULL,
    "confirm_authority" BOOLEAN NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reject_reason" TEXT,
    "ip_hash" TEXT NOT NULL,
    "name_matches_registry" BOOLEAN,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(3),

    CONSTRAINT "profile_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profile" (
    "mst" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "province_slug" TEXT NOT NULL,
    "group_slug" TEXT NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "services" JSONB NOT NULL DEFAULT '[]',
    "public_phone" TEXT,
    "public_zalo" TEXT,
    "website" TEXT,
    "public_email" TEXT,
    "logo_url" TEXT,
    "source_submission_id" TEXT NOT NULL,
    "approved_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_profile_pkey" PRIMARY KEY ("mst")
);

-- CreateTable
CREATE TABLE "featured_placement" (
    "id" TEXT NOT NULL,
    "mst" TEXT NOT NULL,
    "group_slug" TEXT NOT NULL,
    "province_slug" TEXT NOT NULL,
    "position" SMALLINT NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_placement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_lead" (
    "id" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "mst" TEXT,
    "group_slug" TEXT NOT NULL,
    "province_slug" TEXT NOT NULL,
    "message" TEXT,
    "status" "SponsorLeadStatus" NOT NULL DEFAULT 'NEW',
    "ip_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_submission_status_created_at_idx" ON "profile_submission"("status", "created_at");

-- CreateIndex
CREATE INDEX "profile_submission_mst_idx" ON "profile_submission"("mst");

-- CreateIndex
CREATE INDEX "profile_submission_ip_hash_created_at_idx" ON "profile_submission"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "business_profile_group_slug_province_slug_idx" ON "business_profile"("group_slug", "province_slug");

-- CreateIndex
CREATE INDEX "featured_placement_group_slug_province_slug_position_idx" ON "featured_placement"("group_slug", "province_slug", "position");

-- CreateIndex
CREATE INDEX "sponsor_lead_status_created_at_idx" ON "sponsor_lead"("status", "created_at");

-- CreateIndex
CREATE INDEX "sponsor_lead_ip_hash_created_at_idx" ON "sponsor_lead"("ip_hash", "created_at");


-- Checks (not expressible in schema.prisma; the app validates the same rules first)
ALTER TABLE "profile_submission"
    ADD CONSTRAINT "profile_submission_mst_format" CHECK ("mst" ~ '^\d{10}(-\d{3})?$'),
    ADD CONSTRAINT "profile_submission_services_max6" CHECK (jsonb_typeof("services") = 'array' AND jsonb_array_length("services") <= 6),
    ADD CONSTRAINT "profile_submission_confirm_authority" CHECK ("confirm_authority"),
    ADD CONSTRAINT "profile_submission_consent" CHECK ("consent_publish" OR COALESCE("public_phone", "public_zalo", "website", "public_email") IS NULL);

ALTER TABLE "business_profile"
    ADD CONSTRAINT "business_profile_mst_format" CHECK ("mst" ~ '^\d{10}(-\d{3})?$'),
    ADD CONSTRAINT "business_profile_services_max6" CHECK (jsonb_typeof("services") = 'array' AND jsonb_array_length("services") <= 6);

ALTER TABLE "featured_placement"
    ADD CONSTRAINT "featured_placement_position_1_3" CHECK ("position" BETWEEN 1 AND 3),
    ADD CONSTRAINT "featured_placement_range" CHECK ("starts_at" < "ends_at");
