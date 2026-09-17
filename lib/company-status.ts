// Company.status holds two families of wording: tax-office text (e.g. "NNT đang hoạt động",
// "NNT ngừng hoạt động...") for records enriched from the tax lookup, and registry text as-is
// (e.g. "Đang hoạt động", "Tạm ngừng kinh doanh") for rows filled from provincial open-data files
// (see pipeline/opendata.ts). Both families are matched by the same substrings below, so callers
// never need to know which source a row came from.

/** Case-insensitive substring shared with the SQL ILIKE filter in lib/directory-web.ts. */
export const ACTIVE_STATUS_SUBSTRING = "đang hoạt động";

const STOPPED_SUBSTRINGS = ["ngừng", "chấm dứt", "giải thể", "không hoạt động", "không còn hoạt động"];

export type StatusTone = "active" | "stopped" | "neutral";

export function statusTone(status: string): StatusTone {
  const s = status.toLowerCase();
  if (STOPPED_SUBSTRINGS.some((kw) => s.includes(kw))) return "stopped";
  if (s.includes(ACTIVE_STATUS_SUBSTRING)) return "active";
  return "neutral";
}

export function isActiveStatus(status: string): boolean {
  return statusTone(status) === "active";
}
