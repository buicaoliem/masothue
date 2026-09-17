"use client";

import Script from "next/script";
import { useActionState, useState } from "react";
import { DIRECTORY_GROUPS } from "@/lib/directory/groups";
import { PROVINCES } from "@/pipeline/province";
import dirStyles from "../components/directory.module.css";
import styles from "../components/directoryForm.module.css";
import { submitSponsorLeadAction } from "./actions";
import { INITIAL_LEAD_STATE } from "./formState";
import { REL_EXTERNAL_INFO } from "@/lib/relAttrs";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Props = { initialGroupSlug: string; initialProvinceSlug: string; initialMst: string; zaloNumber: string | null };

export function SponsorForm({ initialGroupSlug, initialProvinceSlug, initialMst, zaloNumber }: Props) {
  const [state, action, pending] = useActionState(submitSponsorLeadAction, INITIAL_LEAD_STATE);

  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [groupSlug, setGroupSlug] = useState(initialGroupSlug);
  const [provinceSlug, setProvinceSlug] = useState(initialProvinceSlug);
  const [mst, setMst] = useState(initialMst);
  const [message, setMessage] = useState("");

  const err = (key: string) => state.errors[key] && <p className={styles.error}>{state.errors[key]}</p>;

  if (state.submitted) {
    return (
      <div className={styles.done} role="status">
        <div className={styles.doneIc}>✓</div>
        <h2>Đã nhận yêu cầu</h2>
        <p>Chúng tôi sẽ gọi lại để báo giá.</p>
        <div className={dirStyles.act}>
          <a className={dirStyles.btnGhost + " " + dirStyles.btn} href="/danh-ba">
            Về danh bạ
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className={styles.formwrap} noValidate>
      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
        </>
      )}
      <div className={styles.fs}>
        <h2>Nhận báo giá</h2>
        <div className={styles.grid2}>
          <div className={styles.fld}>
            <label className={styles.lbl} htmlFor="contactName">
              Họ và tên
            </label>
            <input id="contactName" name="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={120} />
            {err("contactName")}
          </div>
          <div className={styles.fld}>
            <label className={styles.lbl} htmlFor="phone">
              Số điện thoại
            </label>
            <input id="phone" name="phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {err("phone")}
          </div>
          <div className={styles.fld}>
            <label className={styles.lbl} htmlFor="groupSlug">
              Ngành muốn đứng đầu
            </label>
            <select id="groupSlug" name="groupSlug" value={groupSlug} onChange={(e) => setGroupSlug(e.target.value)}>
              <option value="">Chọn ngành</option>
              {DIRECTORY_GROUPS.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.label}
                </option>
              ))}
            </select>
            {err("groupSlug")}
          </div>
          <div className={styles.fld}>
            <label className={styles.lbl} htmlFor="provinceSlug">
              Tỉnh, thành phố
            </label>
            <select id="provinceSlug" name="provinceSlug" value={provinceSlug} onChange={(e) => setProvinceSlug(e.target.value)}>
              <option value="">Chọn tỉnh, thành phố</option>
              {PROVINCES.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.displayName}
                </option>
              ))}
            </select>
            {err("provinceSlug")}
          </div>
        </div>
        <div className={styles.fld}>
          <label className={styles.lbl} htmlFor="mst">
            Mã số thuế <span className={styles.opt}>(không bắt buộc)</span>
          </label>
          <input id="mst" name="mst" inputMode="numeric" value={mst} onChange={(e) => setMst(e.target.value)} />
          {err("mst")}
        </div>
        <div className={styles.fld}>
          <label className={styles.lbl} htmlFor="message">
            Lời nhắn <span className={styles.opt}>(không bắt buộc)</span>
          </label>
          <textarea id="message" name="message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          {err("message")}
        </div>

        {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="hp_company">Tên công ty (để trống)</label>
          <input id="hp_company" name="hp_company" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>

        {state.message && <p className={styles.error} role="alert">{state.message}</p>}

        <div className={dirStyles.act}>
          {zaloNumber && (
            <a className={dirStyles.btnGhost + " " + dirStyles.btn} href={`https://zalo.me/${zaloNumber}`} target="_blank" rel={REL_EXTERNAL_INFO}>
              Nhắn Zalo
            </a>
          )}
          <button type="submit" className={dirStyles.btnGold + " " + dirStyles.btn} disabled={pending}>
            {pending ? "Đang gửi…" : "Gửi yêu cầu"}
          </button>
        </div>
      </div>
    </form>
  );
}
