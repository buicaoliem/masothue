import { cache } from "react";
import { getCompany } from "@/lib/company";
import { getActivePlacements, getProfile, type ActivePlacement, type PublicProfile } from "@/lib/directory";

export type CompanyPageCompany = NonNullable<Awaited<ReturnType<typeof getCompany>>>;
type Company = CompanyPageCompany;

export type CompanyPageData =
  | { notFound: true }
  | { notFound: false; company: Company | null; profile: PublicProfile | null; isPaid: boolean };

type Deps = {
  getCompanySafe: (taxCode: string) => Promise<Company | null>;
  getProfile: (taxCode: string) => Promise<PublicProfile | null>;
  getActivePlacements: (groupSlug: string, provinceSlug: string) => Promise<ActivePlacement[]>;
};

/** Request-scoped: generateMetadata() and the page both need the profile; it is queried once per request. */
export const getProfileOnce = cache((taxCode: string) => getProfile(taxCode));

const DEFAULT_DEPS: Deps = { getCompanySafe: getCompany, getProfile: getProfileOnce, getActivePlacements };

/**
 * Loads the data for /[taxCode]. Hidden companies and companies with a pending/approved removal
 * request are excluded because getProfile and getCompany already filter them out at the data
 * layer — if both come back empty after a successful read, the page 404s. A DB/timeout error
 * must throw so ISR does not cache a 404. isPaid drives the "Đứng đầu ngành" layout and
 * naturally falls back to the free layout once the active placement's ends_at passes.
 */
export async function loadCompanyPageData(taxCode: string, deps: Deps = DEFAULT_DEPS): Promise<CompanyPageData> {
  const [company, profile] = await Promise.all([deps.getCompanySafe(taxCode), deps.getProfile(taxCode)]);
  if (!company && !profile) return { notFound: true };

  const placements = profile ? await deps.getActivePlacements(profile.groupSlug, profile.provinceSlug) : [];
  const isPaid = profile !== null && placements.some((p) => p.mst === profile.mst);

  return { notFound: false, company, profile, isPaid };
}
