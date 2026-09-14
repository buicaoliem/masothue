// Gross <-> Net salary calculation for 2026 (PIT + employee-side social insurance).
// All figures come from lib/tools/payroll-config.ts — nothing here is invented.

import {
  CAP_BHXH_BHYT,
  DEDUCTION_DEPENDENT,
  DEDUCTION_SELF,
  RATE_BHTN,
  RATE_BHXH,
  RATE_BHYT,
  TAX_BRACKETS,
  capBhtn,
  type Region,
} from "./payroll-config";

export type Insurance = {
  bhxh: number;
  bhyt: number;
  bhtn: number;
  total: number;
  bhxhCapped: boolean;
  bhytCapped: boolean;
  bhtnCapped: boolean;
};

export type TaxBracket = { rate: number; upTo: number };

export type PayrollResult = {
  gross: number;
  insurance: Insurance;
  deduction: number;
  taxableIncome: number;
  tax: number;
  taxBracket: TaxBracket | null;
  net: number;
};

export function computeInsurance(gross: number, region: Region): Insurance {
  const capBhtnValue = capBhtn(region);
  const bhxhBase = Math.min(gross, CAP_BHXH_BHYT);
  const bhytBase = Math.min(gross, CAP_BHXH_BHYT);
  const bhtnBase = Math.min(gross, capBhtnValue);
  const bhxh = Math.round(bhxhBase * RATE_BHXH);
  const bhyt = Math.round(bhytBase * RATE_BHYT);
  const bhtn = Math.round(bhtnBase * RATE_BHTN);
  return {
    bhxh,
    bhyt,
    bhtn,
    total: bhxh + bhyt + bhtn,
    bhxhCapped: gross > CAP_BHXH_BHYT,
    bhytCapped: gross > CAP_BHXH_BHYT,
    bhtnCapped: gross > capBhtnValue,
  };
}

/** Progressive PIT on the monthly taxable income (TNTT), quick-formula brackets. */
export function computeTax(taxableIncome: number): { tax: number; bracket: TaxBracket | null } {
  if (taxableIncome <= 0) return { tax: 0, bracket: null };
  const bracket = TAX_BRACKETS.find((b) => taxableIncome <= b.upTo)!;
  const tax = Math.round(taxableIncome * bracket.rate - bracket.deduction);
  return { tax, bracket: { rate: bracket.rate, upTo: bracket.upTo } };
}

export function grossToNet(gross: number, dependents: number, region: Region): PayrollResult {
  const insurance = computeInsurance(gross, region);
  const deduction = DEDUCTION_SELF + DEDUCTION_DEPENDENT * dependents;
  const taxableIncome = Math.max(0, gross - insurance.total - deduction);
  const { tax, bracket } = computeTax(taxableIncome);
  const net = gross - insurance.total - tax;
  return { gross, insurance, deduction, taxableIncome, tax, taxBracket: bracket, net };
}

/**
 * Net -> Gross by bisection: search for the gross whose grossToNet(...).net matches the
 * requested net, then return the forward calculation for that gross (so the breakdown is
 * always internally consistent / self-verifying).
 */
export function netToGross(net: number, dependents: number, region: Region): PayrollResult {
  let lo = net;
  let hi = net * 3 + 100_000_000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const result = grossToNet(Math.round(mid), dependents, region);
    if (result.net < net) lo = mid;
    else hi = mid;
  }
  return grossToNet(Math.round(hi), dependents, region);
}

/** 1234567 -> "1.234.567" */
export const formatVnd = (n: number) => Math.round(n).toLocaleString("vi-VN");
