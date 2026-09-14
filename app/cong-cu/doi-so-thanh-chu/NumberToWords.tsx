"use client";

import { useState } from "react";
import { amountToWords, MAX_DIGITS, onlyDigits } from "@/lib/tools/number-to-words";
import { CopyTextButton } from "../CopyTextButton";
import styles from "../tools.module.css";

const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function NumberToWords() {
  const [digits, setDigits] = useState("");
  const words = digits ? amountToWords(digits) : null;

  return (
    <div className={styles.panel}>
      <div className={styles.field}>
        <label htmlFor="amount" className={styles.label}>
          Số tiền (đồng)
        </label>
        <input
          id="amount"
          inputMode="numeric"
          autoComplete="off"
          placeholder="VD: 1.234.000"
          value={groupDigits(digits)}
          onChange={(e) => setDigits(onlyDigits(e.target.value).slice(0, MAX_DIGITS))}
          className={`${styles.input} ${styles.inputLarge}`}
        />
        <p className={styles.hint}>Tối đa {MAX_DIGITS} chữ số.</p>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Số tiền bằng chữ</span>
        <p className={`${styles.result} ${styles.resultStrong}`} aria-live="polite">
          {words ?? <span className={styles.empty}>Kết quả hiện ở đây</span>}
        </p>
      </div>

      <div className={styles.actions}>
        <CopyTextButton value={words ?? ""} />
      </div>
    </div>
  );
}
