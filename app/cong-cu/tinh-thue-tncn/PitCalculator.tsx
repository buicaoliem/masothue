"use client";

import { useState } from "react";
import { CopyTextButton } from "../CopyTextButton";
import { onlyDigits } from "@/lib/tools/number-to-words";
import { formatVnd } from "@/lib/tools/payroll";
import { computePit, type PitResult } from "@/lib/tools/pit";
import styles from "../tools.module.css";

const MAX_DIGITS = 12;
const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function bracketLabel(index: number, upTo: number, rate: number): string {
  return `Bậc ${index + 1} (đến ${upTo === Infinity ? "trên 100 triệu" : `${formatVnd(upTo)} đ`}) — ${Math.round(rate * 100)}%`;
}

function summarize(income: number, deps: number, result: PitResult): string {
  return [
    `Thu nhập chịu thuế: ${formatVnd(income)} đ`,
    `Số người phụ thuộc: ${deps}`,
    `Thu nhập tính thuế: ${formatVnd(result.taxableIncome)} đ`,
    `Thuế TNCN phải nộp/tháng: ${formatVnd(result.tax)} đ`,
  ].join("\n");
}

export function PitCalculator() {
  const [digits, setDigits] = useState("");
  const [dependents, setDependents] = useState("0");
  const [submitted, setSubmitted] = useState<{ income: number; deps: number; result: PitResult } | null>(null);

  const income = digits ? Number(digits) : null;
  const deps = Math.max(0, Number(dependents) || 0);
  const canSubmit = income !== null && income > 0;

  const onSubmit = () => {
    if (!canSubmit) return;
    setSubmitted({ income, deps, result: computePit(income, deps) });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.field}>
        <label htmlFor="income" className={styles.label}>
          Thu nhập chịu thuế/tháng (đồng)
        </label>
        <input
          id="income"
          inputMode="numeric"
          autoComplete="off"
          placeholder="VD: 20.000.000"
          value={groupDigits(digits)}
          onChange={(e) => setDigits(onlyDigits(e.target.value).slice(0, MAX_DIGITS))}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          className={`${styles.input} ${styles.inputLarge}`}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="dependents" className={styles.label}>
          Số người phụ thuộc
        </label>
        <input
          id="dependents"
          inputMode="numeric"
          autoComplete="off"
          value={dependents}
          onChange={(e) => setDependents(onlyDigits(e.target.value).slice(0, 2))}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          className={styles.input}
        />
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={onSubmit} disabled={!canSubmit} className={styles.primaryBtn}>
          Tính thuế
        </button>
      </div>

      {submitted ? (
        <>
          <dl className={styles.rows} aria-live="polite">
            <div className={styles.row}>
              <dt>Thu nhập tính thuế</dt>
              <dd>{formatVnd(submitted.result.taxableIncome)} đ</dd>
            </div>
            {submitted.result.rows.map((r, i) => (
              <div className={styles.row} key={r.upTo}>
                <dt>{bracketLabel(i, r.upTo, r.rate)}</dt>
                <dd>{formatVnd(r.tax)} đ</dd>
              </div>
            ))}
            <div className={styles.row}>
              <dt>Thuế TNCN phải nộp/tháng</dt>
              <dd>{formatVnd(submitted.result.tax)} đ</dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <CopyTextButton
              value={summarize(submitted.income, submitted.deps, submitted.result)}
              label="Sao chép kết quả"
            />
          </div>
        </>
      ) : (
        <p className={`${styles.result} ${styles.empty}`}>Nhập thu nhập chịu thuế và bấm “Tính thuế” để xem kết quả.</p>
      )}
    </div>
  );
}
