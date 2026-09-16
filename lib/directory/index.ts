import { prisma } from "@/pipeline/db";
import { ensureEnriched } from "@/lib/enrich";
import { createDirectory } from "./service";
import { prismaSql } from "./sql";

// Directory functions bound to the app database. Admin functions must stay behind requireAdmin().

export const directory = createDirectory({ sql: prismaSql(prisma), enrich: ensureEnriched });

export const {
  submitProfile,
  createSponsorLead,
  listPendingSubmissions,
  approveSubmission,
  rejectSubmission,
  listSponsorLeads,
  setLeadStatus,
  createPlacement,
  listPlacements,
  getActivePlacements,
  listProfiles,
  countProfiles,
  getProfile,
  isIndexable,
} = directory;

export { DIRECTORY_GROUPS, findDirectoryGroup, type DirectoryGroup } from "./groups";
export { isAdminAuthorized, requireAdmin } from "./admin-auth";
export { PROFILES_PAGE_SIZE, INDEXABLE_MIN_PROFILES, RATE_LIMIT_PER_DAY } from "./service";
export type { PublicProfile, ActivePlacement, SubmissionRow, SponsorLeadRow, PlacementRow, LeadStatus, Result } from "./service";
