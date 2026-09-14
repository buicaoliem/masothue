"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { lookupCompanyName, submitRemovalRequest, type FieldName, type SubmitState } from "./actions";
import styles from "./removal.module.css";

const TAX_CODE_RE = /^\d{10}(-\d{3})?$/; // same shape as lib/company.ts

const INITIAL: SubmitState = { ok: false, errors: {} };

type Props = { initialTaxCode: string; initialName: string | null };

export function RemovalForm({ initialTaxCode, initialName }: Props) {
  const [state, action, pending] = useActionState(submitRemovalRequest, INITIAL);
  const [values, setValues] = useState({
    taxCode: initialTaxCode,
    reason: "",
    contactEmail: "",
    requesterName: "",
    requesterRelation: "",
  });
  const [companyName, setCompanyName] = useState<string | null>(initialName);
  const lookedUp = useRef(initialName !== null ? initialTaxCode : "");

  // Look the company name up from the store once the tax code is complete.
  useEffect(() => {
    const code = values.taxCode.replace(/\s+/g, "");
    if (!TAX_CODE_RE.test(code)) {
      lookedUp.current = "";
      setCompanyName(null);
      return;
    }
    if (lookedUp.current === code) return;
    lookedUp.current = code;
    let stale = false;
    lookupCompanyName(code)
      .then((name) => !stale && setCompanyName(name))
      .catch(() => !stale && setCompanyName(null));
    return () => {
      stale = true;
    };
  }, [values.taxCode]);

  if (state.ok) {
    return (
      <p className={styles.success} role="status">
        Đã ghi nhận yêu cầu, chúng tôi sẽ xem xét và phản hồi.
      </p>
    );
  }

  const set = (key: FieldName) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));
  const err = (key: FieldName) =>
    state.errors[key] && (
      <p id={`${key}-error`} className={styles.error}>
        {state.errors[key]}
      </p>
    );
  const described = (key: FieldName) => (state.errors[key] ? `${key}-error` : undefined);
  const validCode = TAX_CODE_RE.test(values.taxCode.replace(/\s+/g, ""));

  return (
    <form action={action} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="taxCode" className={styles.label}>
          Mã số thuế
        </label>
        <input
          id="taxCode"
          name="taxCode"
          inputMode="numeric"
          required
          maxLength={20}
          value={values.taxCode}
          onChange={set("taxCode")}
          placeholder="VD: 0100111948"
          aria-describedby={described("taxCode")}
          className={styles.input}
        />
        {err("taxCode")}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Tên doanh nghiệp</span>
        <p className={styles.readonly} aria-live="polite">
          {companyName ?? (validCode ? "Chưa có trong dữ liệu của chúng tôi" : "Tự hiện khi nhập đủ mã số thuế")}
        </p>
      </div>

      <div className={styles.field}>
        <label htmlFor="reason" className={styles.label}>
          Lý do yêu cầu
        </label>
        <textarea
          id="reason"
          name="reason"
          required
          rows={5}
          maxLength={2000}
          value={values.reason}
          onChange={set("reason")}
          aria-describedby={described("reason")}
          className={styles.input}
        />
        {err("reason")}
      </div>

      <div className={styles.field}>
        <label htmlFor="contactEmail" className={styles.label}>
          Email liên hệ
        </label>
        <input
          id="contactEmail"
          name="contactEmail"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          value={values.contactEmail}
          onChange={set("contactEmail")}
          aria-describedby={described("contactEmail")}
          className={styles.input}
        />
        {err("contactEmail")}
      </div>

      <div className={styles.field}>
        <label htmlFor="requesterName" className={styles.label}>
          Tên người yêu cầu <span className={styles.optional}>(không bắt buộc)</span>
        </label>
        <input
          id="requesterName"
          name="requesterName"
          maxLength={120}
          autoComplete="name"
          value={values.requesterName}
          onChange={set("requesterName")}
          aria-describedby={described("requesterName")}
          className={styles.input}
        />
        {err("requesterName")}
      </div>

      <div className={styles.field}>
        <label htmlFor="requesterRelation" className={styles.label}>
          Quan hệ với doanh nghiệp <span className={styles.optional}>(không bắt buộc)</span>
        </label>
        <select
          id="requesterRelation"
          name="requesterRelation"
          value={values.requesterRelation}
          onChange={set("requesterRelation")}
          aria-describedby={described("requesterRelation")}
          className={styles.input}
        >
          <option value="">Chọn</option>
          <option value="OWNER">Chủ doanh nghiệp</option>
          <option value="REPRESENTATIVE">Người đại diện</option>
          <option value="OTHER">Khác</option>
        </select>
        {err("requesterRelation")}
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className={styles.actions}>
        <button type="submit" disabled={pending} className={styles.submit}>
          {pending ? "Đang gửi…" : "Gửi yêu cầu"}
        </button>
      </div>
    </form>
  );
}
