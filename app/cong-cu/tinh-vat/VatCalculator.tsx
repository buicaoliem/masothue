"use client";

import { useState } from "react";
import { MoneyField } from "../MoneyField";
import { SegmentedControl } from "../SegmentedControl";
import { computeVat, formatVnd, VAT_RATES, type VatMode, type VatRate } from "@/lib/tools/vat";
import styles from "../tools.module.css";

const MODES: { value: VatMode; label: string }[] = [
  { value: "extract", label: "Giá đã gồm VAT" },
  { value: "add", label: "Giá chưa có VAT" },
];

const RATE_OPTIONS = VAT_RATES.map((r) => ({ value: r, label: `${r}%` }));

export function VatCalculator() {
  const [digits, setDigits] = useState("");
  const [rate, setRate] = useState<VatRate>(10);
  const [mode, setMode] = useState<VatMode>("extract");
  const result = digits ? computeVat(Number(digits), rate, mode) : null;

  const reset = () => setDigits("");

  return (
    <div className={styles.tp}>
      <div className={styles.panel}>
        <h3>Thông tin</h3>
        <SegmentedControl label="Bạn đang có" options={MODES} value={mode} onChange={setMode} />
        <MoneyField
          id="amount"
          label={mode === "extract" ? "Số tiền đã gồm VAT" : "Số tiền chưa gồm VAT"}
          digits={digits}
          onChange={setDigits}
          maxDigits={13}
          placeholder="VD: 108.000"
        />
        <SegmentedControl<VatRate> label="Thuế suất" options={RATE_OPTIONS} value={rate} onChange={setRate} />
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryBtn} onClick={reset}>
            Nhập lại
          </button>
        </div>
      </div>

      <div className={`${styles.panel} ${styles.res}`} aria-live="polite">
        <h3>Kết quả</h3>
        {result ? (
          <>
            <div className={styles.headline}>
              <div className={styles.headlineLabel}>{mode === "extract" ? "Tiền hàng chưa thuế" : "Tổng thanh toán"}</div>
              <div className={styles.headlineValue}>{formatVnd(mode === "extract" ? result.beforeTax : result.afterTax)} đ</div>
            </div>
            <ul className={styles.lines}>
              <li>
                <span>Tiền trước thuế</span>
                <span>{formatVnd(result.beforeTax)} đ</span>
              </li>
              <li>
                <span>Tiền thuế GTGT ({rate}%)</span>
                <span>{formatVnd(result.tax)} đ</span>
              </li>
              <li className={styles.tot}>
                <span>Tổng thanh toán</span>
                <span>{formatVnd(result.afterTax)} đ</span>
              </li>
            </ul>
          </>
        ) : (
          <p className={`${styles.result} ${styles.empty}`}>Nhập số tiền để xem kết quả.</p>
        )}
      </div>
    </div>
  );
}
