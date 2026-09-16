"use client";

import styles from "./tools.module.css";

/** −/+ stepper, 0–20 (dependents count). */
export function Stepper({ label, value, onChange, max = 20 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div className={styles.step}>
        <button type="button" aria-label="Bớt" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>
          −
        </button>
        <output className={styles.stepValue}>{value}</output>
        <button type="button" aria-label="Thêm" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
          +
        </button>
      </div>
    </div>
  );
}
