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

// Plain-language reading of each status wording that occurs in the data (checked 2026-10-24 over all listable rows).
// Each sentence only restates what the official wording says; an unknown wording gets no explanation rather than a guess.
const STATUS_EXPLANATIONS: [RegExp, string][] = [
  [/^(nnt )?đang hoạt động/i, "Theo dữ liệu đăng ký, doanh nghiệp đang hoạt động: không ở trạng thái tạm ngừng, giải thể hay bị thu hồi giấy chứng nhận."],
  [/^(tạm ngừng kinh doanh|nnt tạm ngừng kd có thời hạn)/i, "Doanh nghiệp đã thông báo tạm ngừng kinh doanh trong một thời hạn nhất định."],
  [/^đã giải thể, phá sản, chấm dứt tồn tại/i, "Doanh nghiệp đã giải thể, phá sản hoặc chấm dứt tồn tại, không còn hoạt động kinh doanh."],
  [/^bị thu hồi giấy chứng nhận đăng ký doanh nghiệp do cưỡng chế về quản lý thuế/i, "Giấy chứng nhận đăng ký doanh nghiệp đã bị thu hồi theo biện pháp cưỡng chế của cơ quan thuế."],
  [/^(không còn hoạt động kinh doanh|nnt không hoạt động) tại địa chỉ đã đăng ký/i, "Cơ quan quản lý ghi nhận doanh nghiệp không còn hoạt động tại địa chỉ trụ sở đã đăng ký."],
  [/^đang làm thủ tục giải thể, đã bị chia, bị hợp nhất, bị sáp nhập/i, "Doanh nghiệp đang làm thủ tục giải thể, hoặc đã bị chia, hợp nhất hay sáp nhập vào doanh nghiệp khác."],
  [/^nnt ngừng hoạt động và đã hoàn thành thủ tục chấm dứt hiệu lực mst/i, "Doanh nghiệp đã ngừng hoạt động và hoàn tất thủ tục chấm dứt hiệu lực mã số thuế."],
  [/^nnt ngừng hđ nhưng chưa hoàn thành thủ tục chấm dứt hiệu lực mst/i, "Doanh nghiệp đã ngừng hoạt động nhưng chưa hoàn tất thủ tục chấm dứt hiệu lực mã số thuế."],
  [/^nnt chờ xác minh tình trạng hoạt động tại địa chỉ đã đăng ký/i, "Cơ quan thuế đang xác minh doanh nghiệp còn hoạt động tại địa chỉ đã đăng ký hay không."],
];

/** One plain sentence saying what the registered status means, or null for a wording not in the list. */
export function explainStatus(status: string | null | undefined): string | null {
  const s = status?.trim();
  if (!s) return null;
  return STATUS_EXPLANATIONS.find(([re]) => re.test(s))?.[1] ?? null;
}

/** "7 năm 3 tháng" / "5 tháng" between a founding date and `now`; null for a future or missing date or under one month. */
export function companyAge(activeDate: Date | null | undefined, now: Date): string | null {
  if (!activeDate) return null;
  let months = (now.getUTCFullYear() - activeDate.getUTCFullYear()) * 12 + (now.getUTCMonth() - activeDate.getUTCMonth());
  if (now.getUTCDate() < activeDate.getUTCDate()) months--;
  if (months < 1) return null;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y > 0 ? `${y} năm` : "", m > 0 ? `${m} tháng` : ""].filter(Boolean).join(" ");
}
