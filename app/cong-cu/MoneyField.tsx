"use client";

import { onlyDigits } from "@/lib/tools/number-to-words";
import styles from "./tools.module.css";

const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Money input: live thousand separators while typing, "đồng" suffix baked into the field. */
export function MoneyField({
  id,
  label,
  digits,
  onChange,
  maxDigits = 12,
  placeholder = "0",
  hint,
}: {
  id: string;
  label: string;
  digits: string;
  onChange: (digits: string) => void;
  maxDigits?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.money}>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={groupDigits(digits)}
          onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, maxDigits))}
          className={`${styles.input} ${styles.inputLarge}`}
        />
        <span className={styles.moneySuffix}>đồng</span>
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
