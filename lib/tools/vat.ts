// VAT on whole-đồng amounts.

export const VAT_RATES = [0, 5, 8, 10] as const;
export type VatRate = (typeof VAT_RATES)[number];
export type VatMode = "extract" | "add"; // extract: amount already includes VAT; add: amount is before VAT

export type VatResult = { beforeTax: number; tax: number; afterTax: number };

export function computeVat(amount: number, rate: VatRate, mode: VatMode): VatResult {
  if (mode === "add") {
    const tax = Math.round((amount * rate) / 100);
    return { beforeTax: amount, tax, afterTax: amount + tax };
  }
  const beforeTax = Math.round((amount * 100) / (100 + rate));
  return { beforeTax, tax: amount - beforeTax, afterTax: amount };
}

/** 1234567 -> "1.234.567" */
export const formatVnd = (n: number) => n.toLocaleString("vi-VN");
