import { findDirectoryGroup, INDEXABLE_MIN_PROFILES } from "@/lib/directory";
import { getProvinceCountsForGroup } from "@/lib/directory-web";
import { PROVINCES } from "@/pipeline/province";

export type GroupPageProvince = { slug: string; displayName: string; count: number };

export type GroupPageData =
  | { notFound: true }
  | { notFound: false; groupLabel: string; indexable: boolean; provinces: GroupPageProvince[] };

type Deps = {
  findDirectoryGroup: typeof findDirectoryGroup;
  getProvinceCountsForGroup: typeof getProvinceCountsForGroup;
};

const DEFAULT_DEPS: Deps = { findDirectoryGroup, getProvinceCountsForGroup };

/** Loads the data for /danh-ba/[group]: the province chips (with counts) that have this group, and whether the group is indexable nationwide. */
export async function loadGroupPageData(groupSlug: string, deps: Deps = DEFAULT_DEPS): Promise<GroupPageData> {
  const group = deps.findDirectoryGroup(groupSlug);
  if (!group) return { notFound: true };

  const counts = await deps.getProvinceCountsForGroup(groupSlug);
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const provinces = PROVINCES.filter((p) => (counts.get(p.slug) ?? 0) > 0)
    .map((p) => ({ slug: p.slug, displayName: p.displayName, count: counts.get(p.slug) ?? 0 }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "vi"));

  return { notFound: false, groupLabel: group.label, indexable: total >= INDEXABLE_MIN_PROFILES, provinces };
}
