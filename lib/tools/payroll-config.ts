// Payroll (Gross <-> Net) constants for 2026. All figures below are the only numbers
// this tool is allowed to use — do not add or "helpfully" adjust anything here from memory.

/** Personal income tax deductions, đồng/tháng. */
export const DEDUCTION_SELF = 15_500_000;
export const DEDUCTION_DEPENDENT = 6_200_000;

/** Employee-side contribution rates. */
export const RATE_BHXH = 0.08;
export const RATE_BHYT = 0.015;
export const RATE_BHTN = 0.01;

/**
 * Trần đóng BHXH & BHYT, đồng/tháng.
 * [CẦN XÁC NHẬN theo lương cơ sở 2026] — để hằng số riêng, dễ sửa khi có mức lương cơ sở chính thức.
 */
export const CAP_BHXH_BHYT = 46_800_000;

export type Region = "I" | "II" | "III" | "IV";

/** Lương tối thiểu vùng, đồng/tháng — dùng để tính trần đóng BHTN (= 20 lần LTTV). */
export const REGIONAL_MIN_WAGE: Record<Region, number> = {
  I: 5_310_000,
  II: 4_730_000,
  III: 4_140_000,
  IV: 3_700_000,
};

export const REGION_LABELS: Record<Region, string> = {
  I: "Vùng I",
  II: "Vùng II",
  III: "Vùng III",
  IV: "Vùng IV",
};

/** Trần đóng BHTN theo vùng = 20 × lương tối thiểu vùng. */
export const capBhtn = (region: Region) => REGIONAL_MIN_WAGE[region] * 20;

/** Biểu thuế TNCN lũy tiến từng phần 2026, công thức tính nhanh trên thu nhập tính thuế (TNTT)/tháng. */
export const TAX_BRACKETS: { upTo: number; rate: number; deduction: number }[] = [
  { upTo: 10_000_000, rate: 0.05, deduction: 0 },
  { upTo: 30_000_000, rate: 0.1, deduction: 500_000 },
  { upTo: 60_000_000, rate: 0.2, deduction: 3_500_000 },
  { upTo: 100_000_000, rate: 0.3, deduction: 9_500_000 },
  { upTo: Infinity, rate: 0.35, deduction: 14_500_000 },
];
