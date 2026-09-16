"use client";

import { useState } from "react";
import { mstHint, type MstHint } from "./components/mstHint";
import { MstDigitBoxes, mstMessage } from "./components/MstDigitBoxes";
import styles from "./components/site.module.css";

/** Home page hero search: plain GET form (works without JS) plus a live MST checksum hint. */
export function HomeHero() {
  const [value, setValue] = useState("");
  const hint: MstHint = mstHint(value);
  const message = mstMessage(hint, "home");

  return (
    <form
      action="/tim-kiem"
      method="get"
      role="search"
      className={`${styles.search} ${styles.searchLarge} ${styles.heroForm}`}
    >
      <label htmlFor="hq" className={styles.visuallyHidden}>
        Mã số thuế hoặc tên công ty
      </label>
      <input
        id="hq"
        type="text"
        name="q"
        autoComplete="off"
        placeholder="Ví dụ: 0101248141"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={styles.searchInput}
      />
      <button type="submit" className={styles.searchBtn}>
        Tra cứu
      </button>
      <div
        className={`${styles.check} ${styles.heroFull} ${message.tone === "ok" ? styles.checkOk : message.tone === "bad" ? styles.checkBad : ""}`}
        aria-live="polite"
      >
        {message.text}
      </div>
      <div className={styles.heroFull}>
        <MstDigitBoxes hint={hint} />
      </div>
    </form>
  );
}
