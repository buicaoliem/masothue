"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { VsicVersion } from "@/lib/vsic/types";
import { convertAction, type ConvertResponse } from "./actions";
import styles from "../tools.module.css";
import v from "../../ma-nganh-2025/vsic.module.css";

const REL: Record<string, string> = { one_to_one: "1 → 1", one_to_many: "1 → nhiều", many_to_one: "nhiều → 1", many_to_many: "nhiều ↔ nhiều", partial: "một phần", unknown: "chưa rõ" };
const REVIEW = "Cần đối chiếu hoạt động thực tế để chọn mã phù hợp.";

export function VsicConverter({ initialCode = "", initialFrom = "2018" }: { initialCode?: string; initialFrom?: VsicVersion }) {
  const [from, setFrom] = useState<VsicVersion>(initialFrom);
  const [value, setValue] = useState(initialCode);
  const [res, setRes] = useState<ConvertResponse | null>(null);
  const [pending, start] = useTransition();
  const ran = useRef(false);
  const to: VsicVersion = from === "2018" ? "2025" : "2018";

  const run = (f: VsicVersion, input: string) => start(async () => setRes(await convertAction(f, input)));
  useEffect(() => {
    if (initialCode && !ran.current) {
      ran.current = true;
      start(async () => setRes(await convertAction(initialFrom, initialCode)));
    }
  }, [initialCode, initialFrom]);

  return (
    <div className={`${styles.panel} ${styles.panelNarrow}`}>
      <div className={styles.field}>
        <span className={styles.label} id="vsic-dir">
          Chiều chuyển đổi
        </span>
        <div className={styles.seg} role="group" aria-labelledby="vsic-dir">
          {(["2018", "2025"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={from === f ? styles.segOn : ""}
              aria-pressed={from === f}
              onClick={() => {
                setFrom(f);
                setRes(null);
              }}
            >
              {f} → {f === "2018" ? "2025" : "2018"}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="vsic-in" className={styles.label}>
          Mã ngành VSIC {from} hoặc tên ngành
        </label>
        <input
          id="vsic-in"
          className={`${styles.input} ${styles.inputLarge}`}
          value={value}
          autoComplete="off"
          placeholder={from === "2018" ? "VD: 6201 hoặc lập trình máy vi tính" : "VD: 62110 hoặc lập trình máy tính"}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(from, value)}
        />
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.primaryBtn} disabled={pending || !value.trim()} onClick={() => run(from, value)}>
          {pending ? "Đang tra…" : "Chuyển đổi"}
        </button>
      </div>

      <div aria-live="polite" style={{ marginTop: 16 }}>
        {res?.kind === "invalid" && <p className={styles.error}>{res.message}</p>}
        {res?.kind === "not_found" && (
          <p className={v.empty}>
            Mã {res.code} không có trong bảng chuyển đổi chính thức của VSIC {res.from}. Kiểm tra lại mã hoặc tìm theo tên ngành.
          </p>
        )}
        {res?.kind === "choices" &&
          (res.hits.length ? (
            <>
              <p className={v.hintLine}>Chọn một ngành để xem mã tương ứng:</p>
              <ul className={v.results}>
                {res.hits.map((h) => (
                  <li key={h.code} className={v.result}>
                    <button
                      type="button"
                      className={v.mini}
                      onClick={() => {
                        setValue(h.code);
                        run(res.from, h.code);
                      }}
                    >
                      {h.code}
                    </button>{" "}
                    {h.name} <span className={v.lvl}>Cấp {h.level}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={v.empty}>Không tìm thấy ngành nào khớp với tên đã nhập trong VSIC {res.from}.</p>
          ))}
        {res?.kind === "result" && (
          <div>
            <p>
              <strong>
                VSIC {res.from}: {res.code}
              </strong>{" "}
              · {res.name}
            </p>
            {res.targets.length > 0 ? (
              <Table title={`Mã tương ứng trong VSIC ${to} theo bảng chính thức`} rows={res.targets} />
            ) : res.viaParent ? (
              <>
                <p className={v.notice}>
                  Bảng chính thức không có dòng riêng cho mã {res.code}. Chỉ có liên kết ở cấp cao hơn: {res.viaParent.code}
                  {res.viaParent.name ? ` - ${res.viaParent.name}` : ""}.
                </p>
                <Table title={`Mã cấp ${res.viaParent.code.length} tương ứng trong VSIC ${to}`} rows={res.viaParent.targets} />
              </>
            ) : (
              <p className={v.notice}>Bảng chính thức không có mã tương ứng trong VSIC {to} cho mã này.</p>
            )}
            {res.peers.length > 0 && (
              <p className={v.notice}>
                Các mã VSIC {res.from} khác cùng chuyển về mã đích này: {res.peers.map((p) => `${p.code}${p.name ? ` (${p.name})` : ""}`).join("; ")}.
              </p>
            )}
            {res.needsReview && (
              <p className={v.warn}>
                {res.notes.filter((n) => n !== REVIEW).join(" ")} <strong>{REVIEW}</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: { toCode: string; toName?: string; relationship: string; flagged: boolean; href?: string }[] }) {
  return (
    <table className={v.mapTable}>
      <caption style={{ textAlign: "left", color: "var(--muted)" }}>{title}</caption>
      <thead>
        <tr>
          <th scope="col">Mã</th>
          <th scope="col">Tên ngành</th>
          <th scope="col">Quan hệ trong bảng</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.toCode}>
            <td>
              <strong>{r.toCode}</strong>
              {r.flagged ? " (*)" : ""}
            </td>
            <td>{r.href ? <Link href={r.href}>{r.toName}</Link> : r.toName}</td>
            <td>
              <span className={v.rel}>{REL[r.relationship] ?? r.relationship}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
