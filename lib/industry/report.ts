// Pure helpers for the industry quality report (percentiles, threshold sweeps).

/** Nearest-rank percentile of a numeric list (p in 0..100). Empty list -> 0. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

export const PERCENTILES = [50, 75, 90, 95, 99] as const;

export function percentileTable(values: readonly number[]): Record<string, number> {
  return Object.fromEntries(PERCENTILES.map((p) => [`P${p}`, percentile(values, p)]));
}

/** How many values exceed each cut (used to show what a saturation threshold would remove). */
export function countAbove(values: readonly number[], cuts: readonly number[]): Record<string, number> {
  return Object.fromEntries(cuts.map((c) => [`>${Math.round(c * 100)}%`, values.filter((v) => v > c).length]));
}
