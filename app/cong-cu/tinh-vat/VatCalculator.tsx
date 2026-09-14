"use client";

import { useState } from "react";
import { onlyDigits } from "@/lib/tools/number-to-words";
import { computeVat, formatVnd, VAT_RATES, type VatMode, type VatRate } from "@/lib/tools/vat";
import styles from "../tools.module.css";

const MAX_DIGITS = 13;
const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const MODES: { value: VatMode; label: string }[] = [
  { value: "extract", label: "Tách VAT từ giá đã gồm thuế" },
  { value: "add", label: "Cộng VAT vào giá chưa thuế" },
];

export function VatCalculator() {
  const [digits, setDigits] = useState("");
  const [rate, setRate] = useState<VatRate>(10);
  const [mode, setMode] = useState<VatMode>("extract");
  const result = digits ? computeVat(Number(digits), rate, mode) : null;
  const show = (n: number | undefined) => (n === undefined ? "–" : `${formatVnd(n)} đ`);

  return (
    <div className={styles.panel}>
      <div className={styles.field}>
        <label htmlFor="amount" className={styles.label}>
          {mode === "extract" ? "Số tiền đã gồm VAT (đồng)" : "Số tiền chưa gồm VAT (đồng)"}
        </label>
        <input
          id="amount"
          inputMode="numeric"
          autoComplete="off"
          placeholder="VD: 108.000"
          value={groupDigits(digits)}
          onChange={(e) => setDigits(onlyDigits(e.target.value).slice(0, MAX_DIGITS))}
          className={`${styles.input} ${styles.inputLarge}`}
        />
      </div>

      <fieldset className={styles.field}>
        <legend className={styles.label}>Thuế suất</legend>
        <div className={styles.choices}>
          {VAT_RATES.map((r) => (
            <label key={r} className={styles.choice}>
              <input type="radio" name="rate" checked={rate === r} onChange={() => setRate(r)} />
              {r}%
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend className={styles.label}>Cách tính</legend>
        <div className={styles.choices}>
          {MODES.map((m) => (
            <label key={m.value} className={styles.choice}>
              <input type="radio" name="mode" checked={mode === m.value} onChange={() => setMode(m.value)} />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      <dl className={styles.rows} aria-live="polite">
        <div className={styles.row}>
          <dt>Tiền trước thuế</dt>
          <dd>{show(result?.beforeTax)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Tiền thuế GTGT ({rate}%)</dt>
          <dd>{show(result?.tax)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Tiền sau thuế</dt>
          <dd>{show(result?.afterTax)}</dd>
        </div>
      </dl>
    </div>
  );
}
