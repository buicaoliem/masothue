"use client";

import { useState } from "react";
import { CopyTextButton } from "../CopyTextButton";
import { MoneyField } from "../MoneyField";
import { Stepper } from "../Stepper";
import { TncnBandsTable } from "./TncnBandsTable";
import { formatVnd } from "@/lib/tools/payroll";
import { computePit } from "@/lib/tools/pit";
import styles from "../tools.module.css";

function summarize(income: number, deps: number, taxableIncome: number, tax: number): string {
  return [
    `Thu nhập chịu thuế: ${formatVnd(income)} đ`,
    `Số người phụ thuộc: ${deps}`,
    `Thu nhập tính thuế: ${formatVnd(taxableIncome)} đ`,
    `Thuế TNCN phải nộp/tháng: ${formatVnd(tax)} đ`,
  ].join("\n");
}

export function PitCalculator() {
  const [digits, setDigits] = useState("");
  const [dependents, setDependents] = useState(0);

  const income = digits ? Number(digits) : null;
  const result = income !== null && income > 0 ? computePit(income, dependents) : null;

  const reset = () => {
    setDigits("");
    setDependents(0);
  };

  return (
    <>
      <div className={styles.tp}>
        <div className={styles.panel}>
          <h3>Thông tin</h3>
          <MoneyField
            id="income"
            label="Thu nhập chịu thuế mỗi tháng"
            digits={digits}
            onChange={setDigits}
            placeholder="VD: 20.000.000"
            hint="Lương đã trừ bảo hiểm bắt buộc, chưa trừ giảm trừ gia cảnh."
          />
          <Stepper label="Số người phụ thuộc" value={dependents} onChange={setDependents} />
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
                <div className={styles.headlineLabel}>Thuế TNCN phải nộp mỗi tháng</div>
                <div className={styles.headlineValue}>{formatVnd(result.tax)} đ</div>
              </div>
              <ul className={styles.lines}>
                <li>
                  <span>Thu nhập chịu thuế</span>
                  <span>{formatVnd(income!)} đ</span>
                </li>
                <li className={styles.sub}>
                  <span>Giảm trừ bản thân và người phụ thuộc</span>
                  <span>−{formatVnd(income! - result.taxableIncome)} đ</span>
                </li>
                <li className={styles.tot}>
                  <span>Thu nhập tính thuế</span>
                  <span>{formatVnd(result.taxableIncome)} đ</span>
                </li>
              </ul>
              {result.taxableIncome === 0 ? (
                <p className={`${styles.note} ${styles.noteOk}`}>Thu nhập chưa tới ngưỡng, không phải nộp thuế.</p>
              ) : (
                <p className={styles.note}>
                  Thuế suất thực tế {((result.tax / income!) * 100).toFixed(1).replace(".", ",")}% trên thu nhập chịu thuế.
                </p>
              )}
              <div className={styles.actions}>
                <CopyTextButton
                  value={summarize(income!, dependents, result.taxableIncome, result.tax)}
                  label="Sao chép kết quả"
                />
              </div>
            </>
          ) : (
            <p className={`${styles.result} ${styles.empty}`}>Nhập thu nhập để xem thuế phải nộp.</p>
          )}
        </div>
      </div>

      <TncnBandsTable taxableIncome={result?.taxableIncome ?? 0} />
    </>
  );
}
