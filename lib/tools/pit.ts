// Thuế TNCN từ thu nhập chịu thuế, tái dùng biểu thuế + mức giảm trừ của lib/tools/payroll-config.ts
// (nguồn sự thật duy nhất, dùng chung với công cụ tính lương Gross/Net).

import { DEDUCTION_DEPENDENT, DEDUCTION_SELF, TAX_BRACKETS } from "./payroll-config";

export type PitBracketRow = { upTo: number; rate: number; amount: number; tax: number };

/** Thu nhập tính thuế (TNTT)/tháng = thu nhập chịu thuế − giảm trừ bản thân − giảm trừ người phụ thuộc. */
export function computeTaxableIncome(income: number, dependents: number): number {
  return Math.max(0, income - DEDUCTION_SELF - DEDUCTION_DEPENDENT * dependents);
}

/** Thuế TNCN lũy tiến từng phần trên TNTT, chi tiết theo từng bậc đã áp dụng. */
export function computeTaxBrackets(taxableIncome: number): { tax: number; rows: PitBracketRow[] } {
  if (taxableIncome <= 0) return { tax: 0, rows: [] };
  let prevUpTo = 0;
  let tax = 0;
  const rows: PitBracketRow[] = [];
  for (const bracket of TAX_BRACKETS) {
    const amount = Math.min(taxableIncome, bracket.upTo) - prevUpTo;
    const bracketTax = Math.round(amount * bracket.rate);
    rows.push({ upTo: bracket.upTo, rate: bracket.rate, amount, tax: bracketTax });
    tax += bracketTax;
    prevUpTo = bracket.upTo;
    if (taxableIncome <= bracket.upTo) break;
  }
  return { tax, rows };
}

export type PitResult = { taxableIncome: number; tax: number; rows: PitBracketRow[] };

export function computePit(income: number, dependents: number): PitResult {
  const taxableIncome = computeTaxableIncome(income, dependents);
  const { tax, rows } = computeTaxBrackets(taxableIncome);
  return { taxableIncome, tax, rows };
}
