"use client";

import { useState } from "react";
import { MoneyField } from "../MoneyField";
import { SegmentedControl } from "../SegmentedControl";
import {
  computeOvertime,
  formatVnd,
  hourlyWageFromMonthly,
  OVERTIME_ROWS,
  STANDARD_HOURS_PER_DAY,
  STANDARD_WORKING_DAYS,
  type OvertimeHours,
} from "@/lib/tools/overtime";
import styles from "../tools.module.css";

type InputMode = "monthly" | "hourly";

const MODES: { value: InputMode; label: string }[] = [
  { value: "monthly", label: "Nhập theo lương tháng" },
  { value: "hourly", label: "Nhập lương giờ" },
];

const ZERO_HOURS: OvertimeHours = {
  weekdayDay: 0,
  weekdayNight: 0,
  weeklyRestDay: 0,
  weeklyRestNight: 0,
  holidayDay: 0,
  holidayNight: 0,
};

export function OvertimeCalculator() {
  const [mode, setMode] = useState<InputMode>("monthly");
  const [monthlyDigits, setMonthlyDigits] = useState("");
  const [workingDays, setWorkingDays] = useState(STANDARD_WORKING_DAYS);
  const [hoursPerDay, setHoursPerDay] = useState(STANDARD_HOURS_PER_DAY);
  const [hourlyDigits, setHourlyDigits] = useState("");
  const [hours, setHours] = useState<OvertimeHours>(ZERO_HOURS);
  const [hadWeekdayDayOvertime, setHadWeekdayDayOvertime] = useState(false);

  const hourlyWage =
    mode === "hourly"
      ? hourlyDigits
        ? Number(hourlyDigits)
        : null
      : monthlyDigits
        ? hourlyWageFromMonthly(Number(monthlyDigits), workingDays, hoursPerDay)
        : null;

  const result = hourlyWage ? computeOvertime(hourlyWage, hours, hadWeekdayDayOvertime) : null;

  const setHour = (key: keyof OvertimeHours, value: number) => setHours((h) => ({ ...h, [key]: value }));

  const reset = () => {
    setMonthlyDigits("");
    setWorkingDays(STANDARD_WORKING_DAYS);
    setHoursPerDay(STANDARD_HOURS_PER_DAY);
    setHourlyDigits("");
    setHours(ZERO_HOURS);
    setHadWeekdayDayOvertime(false);
  };

  return (
    <div className={styles.tp}>
      <div className={styles.panel}>
        <h3>Thông tin</h3>
        <SegmentedControl<InputMode> label="Cách nhập lương" options={MODES} value={mode} onChange={setMode} />

        {mode === "monthly" ? (
          <>
            <MoneyField
              id="monthly-salary"
              label="Lương tháng"
              digits={monthlyDigits}
              onChange={setMonthlyDigits}
              placeholder="VD: 10.400.000"
            />
            <div className={styles.field}>
              <label htmlFor="working-days" className={styles.label}>
                Ngày công chuẩn/tháng
              </label>
              <input
                id="working-days"
                type="number"
                min={1}
                className={styles.input}
                value={workingDays}
                onChange={(e) => setWorkingDays(Number(e.target.value))}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="hours-per-day" className={styles.label}>
                Giờ làm việc/ngày
              </label>
              <input
                id="hours-per-day"
                type="number"
                min={1}
                className={styles.input}
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
              />
            </div>
          </>
        ) : (
          <MoneyField
            id="hourly-wage"
            label="Lương giờ"
            digits={hourlyDigits}
            onChange={setHourlyDigits}
            maxDigits={9}
            placeholder="VD: 50.000"
          />
        )}

        <div className={styles.field}>
          <span className={styles.label}>Số giờ làm thêm</span>
          {OVERTIME_ROWS.map(({ key, label }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "6px 0" }}>
              <label htmlFor={`hours-${key}`} style={{ fontSize: 14 }}>
                {label}
              </label>
              <input
                id={`hours-${key}`}
                type="number"
                min={0}
                step={0.5}
                inputMode="decimal"
                className={styles.input}
                style={{ width: 90 }}
                value={hours[key] || ""}
                placeholder="0"
                onChange={(e) => setHour(key, Math.max(0, Number(e.target.value)))}
              />
            </div>
          ))}
        </div>

        <label className={styles.choice} style={{ width: "100%", justifyContent: "flex-start" }}>
          <input
            type="checkbox"
            checked={hadWeekdayDayOvertime}
            onChange={(e) => setHadWeekdayDayOvertime(e.target.checked)}
          />
          Có làm thêm ban ngày trước khi làm thêm ban đêm (ngày thường)
        </label>

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
              <div className={styles.headlineLabel}>Tổng tiền làm thêm</div>
              <div className={styles.headlineValue}>{formatVnd(result.total)} đ</div>
            </div>
            <ul className={styles.lines}>
              <li className={styles.sub}>
                <span>Lương giờ dùng để tính</span>
                <span>{formatVnd(result.hourlyWage)} đ/giờ</span>
              </li>
              {result.lines
                .filter((l) => l.hours > 0)
                .map((l) => (
                  <li key={l.key}>
                    <span>
                      {l.label} ({l.hours} giờ × {Math.round(l.rate * 100)}%)
                    </span>
                    <span>{formatVnd(l.amount)} đ</span>
                  </li>
                ))}
            </ul>
            <p className={styles.note}>
              Đây là mức tối thiểu theo luật; doanh nghiệp có thể trả cao hơn. Người hưởng lương ngày được trả thêm
              tiền lương ngày lễ, tết.
            </p>
          </>
        ) : (
          <p className={`${styles.result} ${styles.empty}`}>Nhập lương và số giờ làm thêm để xem kết quả.</p>
        )}
      </div>
    </div>
  );
}
