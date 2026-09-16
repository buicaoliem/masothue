import { findDirectoryGroup, listPendingSubmissions, listPlacements, listSponsorLeads, type SubmissionRow, type SponsorLeadRow, type PlacementRow } from "@/lib/directory";
import { normalizeName } from "@/lib/directory/validation";
import { findCompanyForLookup } from "@/lib/company";
import { PROVINCES } from "@/pipeline/province";
import { assertAdmin } from "./guard";

export type NameBadge = "match" | "mismatch" | "unknown";
export type PendingSubmissionView = SubmissionRow & {
  nameBadge: NameBadge;
  officialName: string | null;
  groupLabel: string;
  provinceLabel: string;
};

const provinceLabel = (slug: string) => PROVINCES.find((p) => p.slug === slug)?.displayName ?? slug;
const groupLabel = (slug: string) => findDirectoryGroup(slug)?.label ?? slug;

/**
 * Real-time name-match badge for a PENDING submission (approveSubmission only stores this once
 * approved). Wraps the existing store-only lookup in lib/company.ts; no new SQL added here.
 */
async function withNameBadge(s: SubmissionRow): Promise<PendingSubmissionView> {
  const official = await findCompanyForLookup(s.mst);
  const officialName = official?.name ?? null;
  const nameBadge: NameBadge =
    officialName === null ? "unknown" : normalizeName(officialName) === normalizeName(s.companyName) ? "match" : "mismatch";
  return { ...s, nameBadge, officialName, groupLabel: groupLabel(s.groupSlug), provinceLabel: provinceLabel(s.provinceSlug) };
}

export type AdminData = {
  pending: PendingSubmissionView[];
  leads: SponsorLeadRow[];
  placements: (PlacementRow & { groupLabel: string; provinceLabel: string })[];
};

export async function loadAdminData(): Promise<AdminData> {
  await assertAdmin();
  const [pending, leads, placements] = await Promise.all([listPendingSubmissions(), listSponsorLeads(), listPlacements()]);
  return {
    pending: await Promise.all(pending.map(withNameBadge)),
    leads,
    placements: placements.map((p) => ({ ...p, groupLabel: groupLabel(p.groupSlug), provinceLabel: provinceLabel(p.provinceSlug) })),
  };
}
