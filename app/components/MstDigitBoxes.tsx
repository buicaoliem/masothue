"use client";

import { Fragment } from "react";
import type { MstHint } from "./mstHint";
import styles from "./site.module.css";

/** Per-digit boxes below an MST input: dashed box = check digit, dimmed = branch suffix. */
export function MstDigitBoxes({ hint }: { hint: MstHint }) {
  const total = hint.digits.length > 10 ? 13 : 10;
  const cells = Array.from({ length: total }, (_, i) => hint.digits[i]);

  return (
    <div className={styles.digits} aria-hidden="true">
      {cells.map((d, i) => (
        <Fragment key={i}>
          {i === 10 && <span className={styles.digitSep}>-</span>}
          <i
            className={[styles.digitBox, d !== undefined && styles.digitOn, i === 9 && styles.digitKey, i > 9 && styles.digitBranch]
              .filter(Boolean)
              .join(" ")}
          >
            {d ?? ""}
          </i>
        </Fragment>
      ))}
      <small className={styles.digitHint}>
        Ô viền đứt là số kiểm tra, dùng để phát hiện gõ nhầm{total === 13 ? ". 3 ô sau dấu gạch là số chi nhánh" : ""}.
      </small>
    </div>
  );
}

export function mstMessage(hint: MstHint, context: "home" | "tool"): { tone: "" | "ok" | "bad"; text: string } {
  switch (hint.state) {
    case "empty":
      return {
        tone: "",
        text:
          context === "home"
            ? "Gõ đủ 10 số (hoặc 13 số với chi nhánh) để kiểm tra ngay."
            : "Nhập mã số thuế để kiểm tra.",
      };
    case "name":
      return { tone: "", text: context === "home" ? "Đang tìm theo tên công ty." : "Chỉ nhập chữ số." };
    case "short":
      return { tone: "", text: `Còn thiếu ${hint.need} số.` };
    case "short13":
      return { tone: "", text: `Mã chi nhánh cần 13 số, còn thiếu ${hint.need} số.` };
    case "long":
      return { tone: "bad", text: "Mã số thuế chỉ có 10 hoặc 13 số." };
    case "ok":
      return {
        tone: "ok",
        text: (hint.branch ? "Mã chi nhánh hợp lệ." : "Mã hợp lệ.") + (context === "home" ? " Bấm Tra cứu để mở hồ sơ." : ""),
      };
    case "bad":
      return { tone: "bad", text: "Mã không hợp lệ, có thể gõ nhầm một chữ số." };
  }
}
