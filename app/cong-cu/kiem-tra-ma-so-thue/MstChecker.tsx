"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { checkMst, type MstCheckResult } from "./actions";
import styles from "../tools.module.css";

const STATUS_LABEL: Record<"PENDING" | "OK" | "SOURCE_MISS", string> = {
  PENDING: "Đang chờ cập nhật thông tin",
  OK: "Đã có đầy đủ thông tin",
  SOURCE_MISS: "Có trong kho, chưa lấy được tên và địa chỉ",
};

export function MstChecker() {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<MstCheckResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const onCheck = () => {
    const raw = value.trim();
    if (!raw) return;
    startTransition(async () => setResult(await checkMst(raw)));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.field}>
        <label htmlFor="mst" className={styles.label}>
          Mã số thuế
        </label>
        <input
          id="mst"
          inputMode="numeric"
          autoComplete="off"
          placeholder="VD: 0300588569"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCheck()}
          className={`${styles.input} ${styles.inputLarge}`}
        />
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={onCheck} disabled={isPending || !value.trim()} className={styles.primaryBtn}>
          {isPending ? "Đang kiểm tra…" : "Kiểm tra"}
        </button>
      </div>

      {result && (
        <div className={styles.result} aria-live="polite">
          {result.kind === "invalid" && <span className={styles.error}>Mã số thuế không hợp lệ — {result.reason}</span>}

          {result.kind === "not_in_directory" && (
            <span>
              Mã số thuế <strong>{result.taxCode}</strong> hợp lệ — chưa có trong danh bạ.
            </span>
          )}

          {result.kind === "found" && (
            <>
              <div className={styles.resultStrong}>{result.name ?? "(chưa rõ tên doanh nghiệp)"}</div>
              <div>
                Mã số thuế <strong>{result.taxCode}</strong> — {STATUS_LABEL[result.enrichStatus]}.
              </div>
              {result.enrichStatus !== "SOURCE_MISS" && (
                <div className={styles.actions}>
                  <Link href={`/${result.taxCode}`} className={styles.secondaryBtn}>
                    Xem chi tiết
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
