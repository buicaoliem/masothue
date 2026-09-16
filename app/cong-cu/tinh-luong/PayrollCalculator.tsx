"use client";

import { useState } from "react";
import { CopyTextButton } from "../CopyTextButton";
import { MoneyField } from "../MoneyField";
import { Stepper } from "../Stepper";
import { SegmentedControl } from "../SegmentedControl";
import { formatVnd, grossToNet, netToGross, type PayrollResult } from "@/lib/tools/payroll";
import { REGION_LABELS, type Region } from "@/lib/tools/payroll-config";
import styles from "../tools.module.css";

type Direction = "grossToNet" | "netToGross";

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "grossToNet", label: "Gross sang Net" },
  { value: "netToGross", label: "Net sang Gross" },
];

const REGIONS: Region[] = ["I", "II", "III", "IV"];

function summarize(result: PayrollResult): string {
  return [
    `Lương Gross: ${formatVnd(result.gross)} đ`,
    `BHXH (8%): ${formatVnd(result.insurance.bhxh)} đ${result.insurance.bhxhCapped ? " (đã chạm trần)" : ""}`,
    `BHYT (1,5%): ${formatVnd(result.insurance.bhyt)} đ${result.insurance.bhytCapped ? " (đã chạm trần)" : ""}`,
    `BHTN (1%): ${formatVnd(result.insurance.bhtn)} đ${result.insurance.bhtnCapped ? " (đã chạm trần)" : ""}`,
    `Tổng bảo hiểm: ${formatVnd(result.insurance.total)} đ`,
    `Giảm trừ gia cảnh: ${formatVnd(result.deduction)} đ`,
    `Thu nhập tính thuế: ${formatVnd(result.taxableIncome)} đ`,
    `Thuế TNCN${result.taxBracket ? ` (bậc ${Math.round(result.taxBracket.rate * 100)}%)` : ""}: ${formatVnd(result.tax)} đ`,
    `Lương Net: ${formatVnd(result.net)} đ`,
  ].join("\n");
}

export function PayrollCalculator() {
  const [digits, setDigits] = useState("");
  const [direction, setDirection] = useState<Direction>("grossToNet");
  const [dependents, setDependents] = useState(0);
  const [region, setRegion] = useState<Region>("I");

  const amount = digits ? Number(digits) : null;
  const result =
    amount === null || amount <= 0
      ? null
      : direction === "grossToNet"
        ? grossToNet(amount, dependents, region)
        : netToGross(amount, dependents, region);

  const reset = () => {
    setDigits("");
    setDependents(0);
  };

  return (
    <div className={styles.tp}>
      <div className={styles.panel}>
        <h3>Thông tin</h3>
        <SegmentedControl label="Chiều tính" options={DIRECTIONS} value={direction} onChange={setDirection} />
        <MoneyField
          id="amount"
          label={direction === "grossToNet" ? "Lương Gross mỗi tháng" : "Lương Net mong muốn mỗi tháng"}
          digits={digits}
          onChange={setDigits}
          placeholder="VD: 20.000.000"
        />
        <Stepper label="Số người phụ thuộc" value={dependents} onChange={setDependents} />
        <div className={styles.field}>
          <label htmlFor="region" className={styles.label}>
            Vùng làm việc
          </label>
          <select id="region" value={region} onChange={(e) => setRegion(e.target.value as Region)} className={styles.input}>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {REGION_LABELS[r]}
              </option>
            ))}
          </select>
          <p className={styles.hint}>Dùng để tính mức trần đóng bảo hiểm thất nghiệp.</p>
        </div>
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
              <div className={styles.headlineLabel}>{direction === "grossToNet" ? "Lương Net thực nhận" : "Lương Gross cần trả"}</div>
              <div className={styles.headlineValue}>{formatVnd(direction === "grossToNet" ? result.net : result.gross)} đ</div>
            </div>
            <ul className={styles.lines}>
              <li>
                <span>Lương Gross</span>
                <span>{formatVnd(result.gross)} đ</span>
              </li>
              <li className={styles.sub}>
                <span>BHXH (8%){result.insurance.bhxhCapped ? " — đã chạm trần" : ""}</span>
                <span>−{formatVnd(result.insurance.bhxh)} đ</span>
              </li>
              <li className={styles.sub}>
                <span>BHYT (1,5%){result.insurance.bhytCapped ? " — đã chạm trần" : ""}</span>
                <span>−{formatVnd(result.insurance.bhyt)} đ</span>
              </li>
              <li className={styles.sub}>
                <span>BHTN (1%){result.insurance.bhtnCapped ? " — đã chạm trần" : ""}</span>
                <span>−{formatVnd(result.insurance.bhtn)} đ</span>
              </li>
              <li className={styles.sub}>
                <span>Giảm trừ gia cảnh</span>
                <span>{formatVnd(result.deduction)} đ</span>
              </li>
              <li className={styles.sub}>
                <span>Thu nhập tính thuế</span>
                <span>{formatVnd(result.taxableIncome)} đ</span>
              </li>
              <li className={styles.sub}>
                <span>Thuế TNCN{result.taxBracket ? ` (bậc ${Math.round(result.taxBracket.rate * 100)}%)` : ""}</span>
                <span>−{formatVnd(result.tax)} đ</span>
              </li>
              <li className={styles.tot}>
                <span>Lương Net</span>
                <span>{formatVnd(result.net)} đ</span>
              </li>
            </ul>
            <div className={styles.actions}>
              <CopyTextButton value={summarize(result)} label="Sao chép kết quả" />
            </div>
          </>
        ) : (
          <p className={`${styles.result} ${styles.empty}`}>Nhập mức lương để xem kết quả.</p>
        )}
      </div>
    </div>
  );
}
