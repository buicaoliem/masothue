import { unstable_cache } from "next/cache";

/** Tags for public page data. Import jobs and admin takedowns call revalidateTag on these. */
export const CACHE_TAGS = {
  taxonomy: "taxonomy",
  sitemaps: "sitemaps",
  directory: "directory",
  companies: "companies",
  industries: "industries",
  removals: "removals",
} as const;

export const REVALIDATE_S = {
  /** Company detail pages. */
  detail: 60 * 60 * 24 * 30,
  /** List, category, home, sitemaps. */
  list: 60 * 60 * 24,
} as const;

export function cachedQuery<A extends unknown[], R>(
  key: string,
  fn: (...args: A) => Promise<R>,
  opts: { revalidate?: number; tags: string[] },
): (...args: A) => Promise<R> {
  return unstable_cache(fn, [key], { revalidate: opts.revalidate ?? REVALIDATE_S.list, tags: opts.tags }) as (
    ...args: A
  ) => Promise<R>;
}

/** `unstable_cache` JSON-serializes Date to string; callers still expect Date. */
export function asDate(v: Date | string | null | undefined): Date | null {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
