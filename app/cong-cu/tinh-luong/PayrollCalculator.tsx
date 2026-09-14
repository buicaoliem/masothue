"use client";

import { useState } from "react";
import { CopyTextButton } from "../CopyTextButton";
import { onlyDigits } from "@/lib/tools/number-to-words";
import { formatVnd, grossToNet, netToGross, type PayrollResult } from "@/lib/tools/payroll";
import { REGION_LABELS, type Region } from "@/lib/tools/payroll-config";
import styles from "../tools.module.css";

const MAX_DIGITS = 12;
const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

type Direction = "grossToNet" | "netToGross";

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "grossToNet", label: "Gross → Net" },
  { value: "netToGross", label: "Net → Gross" },
];

const REGIONS: Region[] = ["I", "II", "III", "IV"];

function summarize(result: PayrollResult): string {
  const lines = [
    `Lương Gross: ${formatVnd(result.gross)} đ`,
    `BHXH (8%): ${formatVnd(result.insurance.bhxh)} đ${result.insurance.bhxhCapped ? " (đã chạm trần)" : ""}`,
    `BHYT (1,5%): ${formatVnd(result.insurance.bhyt)} đ${result.insurance.bhytCapped ? " (đã chạm trần)" : ""}`,
    `BHTN (1%): ${formatVnd(result.insurance.bhtn)} đ${result.insurance.bhtnCapped ? " (đã chạm trần)" : ""}`,
    `Tổng bảo hiểm: ${formatVnd(result.insurance.total)} đ`,
    `Giảm trừ gia cảnh: ${formatVnd(result.deduction)} đ`,
    `Thu nhập tính thuế: ${formatVnd(result.taxableIncome)} đ`,
    `Thuế TNCN${result.taxBracket ? ` (bậc ${Math.round(result.taxBracket.rate * 100)}%)` : ""}: ${formatVnd(result.tax)} đ`,
    `Lương Net: ${formatVnd(result.net)} đ`,
  ];
  return lines.join("\n");
}

export function PayrollCalculator() {
  const [digits, setDigits] = useState("");
  const [direction, setDirection] = useState<Direction>("grossToNet");
  const [dependents, setDependents] = useState("0");
  const [region, setRegion] = useState<Region>("I");

  const amount = digits ? Number(digits) : null;
  const deps = Math.max(0, Number(dependents) || 0);
  const result =
    amount === null || amount <= 0
      ? null
      : direction === "grossToNet"
        ? grossToNet(amount, deps, region)
        : netToGross(amount, deps, region);

  return (
    <div className={styles.panel}>
      <fieldset className={styles.field}>
        <legend className={styles.label}>Chiều tính</legend>
        <div className={styles.choices}>
          {DIRECTIONS.map((d) => (
            <label key={d.value} className={styles.choice}>
              <input
                type="radio"
                name="direction"
                checked={direction === d.value}
                onChange={() => setDirection(d.value)}
              />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="amount" className={styles.label}>
          {direction === "grossToNet" ? "Lương Gross (đồng/tháng)" : "Lương Net (đồng/tháng)"}
        </label>
        <input
          id="amount"
          inputMode="numeric"
          autoComplete="off"
          placeholder="VD: 20.000.000"
          value={groupDigits(digits)}
          onChange={(e) => setDigits(onlyDigits(e.target.value).slice(0, MAX_DIGITS))}
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
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="region" className={styles.label}>
          Vùng (để tính trần đóng BHTN)
        </label>
        <select
          id="region"
          value={region}
          onChange={(e) => setRegion(e.target.value as Region)}
          className={styles.input}
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {REGION_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {result ? (
        <>
          <dl className={styles.rows} aria-live="polite">
            <div className={styles.row}>
              <dt>Lương Gross</dt>
              <dd>{formatVnd(result.gross)} đ</dd>
            </div>
            <div className={styles.row}>
              <dt>BHXH (8%){result.insurance.bhxhCapped ? " — đã chạm trần" : ""}</dt>
              <dd>{formatVnd(result.insurance.bhxh)} đ</dd>
            </div>
            <div className={styles.row}>
              <dt>BHYT (1,5%){result.insurance.bhytCapped ? " — đã chạm trần" : ""}</dt>
              <dd>{formatVnd(result.insurance.bhyt)} đ</dd>
            </div>
            <div className={styles.row}>
              <dt>BHTN (1%){result.insurance.bhtnCapped ? " — đã chạm trần" : ""}</dt>
              <dd>{formatVnd(result.insurance.bhtn)} đ</dd>
            </div>
            <div className={styles.row}>
              <dt>Tổng bảo hiểm</dt>
              <dd>{formatVnd(result.insurance.total)} đ</dd>
            </div>
            <div className={styles.row}>
              <dt>Giảm trừ gia cảnh</dt>
              <dd>{formatVnd(result.deduction)} đ</dd>
            </div>
            <div className={styles.row}>
              <dt>Thu nhập tính thuế</dt>
              <dd>{formatVnd(result.taxableIncome)} đ</dd>
            </div>
            <div className={styles.row}>
              <dt>Thuế TNCN{result.taxBracket ? ` (bậc ${Math.round(result.taxBracket.rate * 100)}%)` : ""}</dt>
              <dd>{formatVnd(result.tax)} đ</dd>
            </div>
            <div className={styles.row}>
              <dt>Lương Net</dt>
              <dd>{formatVnd(result.net)} đ</dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <CopyTextButton value={summarize(result)} label="Sao chép kết quả" />
          </div>
        </>
      ) : (
        <p className={`${styles.result} ${styles.empty}`}>Nhập số tiền lương để xem kết quả.</p>
      )}
    </div>
  );
}
