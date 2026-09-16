"use client";

import { useState } from "react";
import { MoneyField } from "../MoneyField";
import { SegmentedControl } from "../SegmentedControl";
import {
  annualDeadline,
  computeLatePayment,
  formatIsoDate,
  formatVnd,
  monthlyDeadline,
  quarterlyDeadline,
  todayIso,
  type IsoDate,
} from "@/lib/tools/late-payment";
import styles from "../tools.module.css";

type PeriodType = "month" | "quarter" | "year";

const PERIOD_TYPES: { value: PeriodType; label: string }[] = [
  { value: "month", label: "Khai tháng" },
  { value: "quarter", label: "Khai quý" },
  { value: "year", label: "Quyết toán năm" },
];

const CURRENT_YEAR = new Date().getFullYear();

export function LatePaymentCalculator() {
  const [digits, setDigits] = useState("");
  const [deadline, setDeadline] = useState<IsoDate>("");
  const [paidDate, setPaidDate] = useState<IsoDate>(todayIso());

  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodQuarter, setPeriodQuarter] = useState(1);
  const [periodYear, setPeriodYear] = useState(CURRENT_YEAR);

  const taxAmount = digits ? Number(digits) : null;
  const result = taxAmount && deadline && paidDate ? computeLatePayment(taxAmount, deadline, paidDate) : null;

  const fillDeadline = () => {
    if (periodType === "month") setDeadline(monthlyDeadline(periodYear, periodMonth));
    else if (periodType === "quarter") setDeadline(quarterlyDeadline(periodYear, periodQuarter));
    else setDeadline(annualDeadline(periodYear));
  };

  const reset = () => {
    setDigits("");
    setDeadline("");
    setPaidDate(todayIso());
  };

  return (
    <div className={styles.tp}>
      <div className={styles.panel}>
        <h3>Thông tin</h3>
        <MoneyField
          id="tax-amount"
          label="Số tiền thuế chậm nộp"
          digits={digits}
          onChange={setDigits}
          placeholder="VD: 50.000.000"
        />

        <div className={styles.field}>
          <span className={styles.label}>Điền nhanh hạn nộp theo kỳ</span>
          <SegmentedControl<PeriodType> label="Loại kỳ khai" options={PERIOD_TYPES} value={periodType} onChange={setPeriodType} />
        </div>

        <div className={styles.field}>
          {periodType === "month" && (
            <div style={{ display: "flex", gap: 8 }} role="group" aria-label="Tháng và năm">
              <select
                className={styles.input}
                value={periodMonth}
                onChange={(e) => setPeriodMonth(Number(e.target.value))}
                aria-label="Tháng"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className={styles.input}
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
                aria-label="Năm"
              />
            </div>
          )}
          {periodType === "quarter" && (
            <div style={{ display: "flex", gap: 8 }} role="group" aria-label="Quý và năm">
              <select
                className={styles.input}
                value={periodQuarter}
                onChange={(e) => setPeriodQuarter(Number(e.target.value))}
                aria-label="Quý"
              >
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>
                    Quý {q}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className={styles.input}
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
                aria-label="Năm"
              />
            </div>
          )}
          {periodType === "year" && (
            <input
              type="number"
              className={styles.input}
              value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))}
              aria-label="Năm quyết toán"
            />
          )}
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryBtn} onClick={fillDeadline}>
              Điền hạn nộp
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="deadline" className={styles.label}>
            Hạn nộp
          </label>
          <input
            id="deadline"
            type="date"
            className={styles.input}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <p className={styles.hint}>
            Nếu hạn nộp rơi vào ngày nghỉ, hạn được lùi sang ngày làm việc tiếp theo — hãy nhập đúng ngày hạn thực tế.
          </p>
        </div>

        <div className={styles.field}>
          <label htmlFor="paid-date" className={styles.label}>
            Ngày nộp thực tế
          </label>
          <input
            id="paid-date"
            type="date"
            className={styles.input}
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
          />
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
              <div className={styles.headlineLabel}>Tiền chậm nộp</div>
              <div className={styles.headlineValue}>{formatVnd(result.lateAmount)} đ</div>
            </div>
            <ul className={styles.lines}>
              <li>
                <span>Số ngày chậm nộp</span>
                <span>{result.days} ngày</span>
              </li>
              {result.fromDate && result.toDate && (
                <li className={styles.sub}>
                  <span>Từ ngày … đến ngày …</span>
                  <span>
                    {formatIsoDate(result.fromDate)} – {formatIsoDate(result.toDate)}
                  </span>
                </li>
              )}
              <li className={styles.sub}>
                <span>Mức tính</span>
                <span>0,03%/ngày</span>
              </li>
              <li className={styles.tot}>
                <span>Tổng phải nộp (thuế + tiền chậm nộp)</span>
                <span>{formatVnd(result.totalDue)} đ</span>
              </li>
            </ul>
          </>
        ) : (
          <p className={`${styles.result} ${styles.empty}`}>Nhập số tiền thuế, hạn nộp và ngày nộp để xem kết quả.</p>
        )}
      </div>
    </div>
  );
}
