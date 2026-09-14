"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./tools.module.css";

export function CopyTextButton({ value, label = "Sao chép" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button type="button" className={styles.secondaryBtn} onClick={copy} disabled={!value} aria-live="polite">
      {copied ? "✓ Đã chép" : label}
    </button>
  );
}
