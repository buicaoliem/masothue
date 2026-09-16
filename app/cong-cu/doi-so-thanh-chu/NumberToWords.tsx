"use client";

import { useState } from "react";
import { amountToWords, MAX_DIGITS } from "@/lib/tools/number-to-words";
import { CopyTextButton } from "../CopyTextButton";
import { MoneyField } from "../MoneyField";
import styles from "../tools.module.css";

export function NumberToWords() {
  const [digits, setDigits] = useState("");
  const words = digits ? amountToWords(digits) : null;

  return (
    <div className={styles.tp}>
      <div className={styles.panel}>
        <h3>Số tiền</h3>
        <MoneyField id="amount" label="Số tiền bằng số" digits={digits} onChange={setDigits} maxDigits={MAX_DIGITS} placeholder="VD: 1.234.000" hint={`Tối đa ${MAX_DIGITS} chữ số.`} />
      </div>

      <div className={`${styles.panel} ${styles.res}`} aria-live="polite">
        <h3>Số tiền bằng chữ</h3>
        <p className={styles.words}>{words ?? <span className={styles.empty}>Kết quả hiện ở đây.</span>}</p>
        <div className={styles.actions}>
          <CopyTextButton value={words ?? ""} />
        </div>
      </div>
    </div>
  );
}
