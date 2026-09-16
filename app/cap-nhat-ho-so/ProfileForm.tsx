"use client";

import Script from "next/script";
import { useActionState, useMemo, useState } from "react";
import { DIRECTORY_GROUPS } from "@/lib/directory/groups";
import { PROVINCES } from "@/pipeline/province";
import { mstHint } from "../components/mstHint";
import { MstDigitBoxes, mstMessage } from "../components/MstDigitBoxes";
import siteStyles from "../components/site.module.css";
import dirStyles from "../components/directory.module.css";
import styles from "../components/directoryForm.module.css";
import { DESCRIPTION_MAX, SERVICES_MAX } from "@/lib/directory/validation";
import { submitProfileAction } from "./actions";
import { INITIAL_PROFILE_STATE } from "./formState";

type ServiceRow = { name: string; detail: string };

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Props = { initialMst: string; initialCompanyName: string; initialAddress: string };

export function ProfileForm({ initialMst, initialCompanyName, initialAddress }: Props) {
  const [state, action, pending] = useActionState(submitProfileAction, INITIAL_PROFILE_STATE);

  const [mst, setMst] = useState(initialMst);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [address, setAddress] = useState(initialAddress);
  const [provinceSlug, setProvinceSlug] = useState("");
  const [groupSlug, setGroupSlug] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState<ServiceRow[]>([{ name: "", detail: "" }]);
  const [publicPhone, setPublicPhone] = useState("");
  const [publicZalo, setPublicZalo] = useState("");
  const [website, setWebsite] = useState("");
  const [publicEmail, setPublicEmail] = useState("");
  const [consentPublish, setConsentPublish] = useState(false);
  const [submitterName, setSubmitterName] = useState("");
  const [submitterRole, setSubmitterRole] = useState("");
  const [submitterPhone, setSubmitterPhone] = useState("");
  const [confirmAuthority, setConfirmAuthority] = useState(false);

  const hint = useMemo(() => mstHint(mst), [mst]);
  const msg = mstMessage(hint, "tool");

  const hasContact = [publicPhone, publicZalo, website, publicEmail].some((v) => v.trim() !== "");
  const missing: string[] = [];
  if (hint.state !== "ok") missing.push("mã số thuế hợp lệ");
  if (!companyName.trim()) missing.push("tên doanh nghiệp");
  if (!address.trim()) missing.push("địa chỉ trụ sở");
  if (!provinceSlug) missing.push("tỉnh, thành phố");
  if (!groupSlug) missing.push("nhóm ngành");
  if (!description.trim()) missing.push("giới thiệu ngắn");
  if (!submitterName.trim()) missing.push("họ tên người gửi");
  if (!submitterRole.trim()) missing.push("chức vụ người gửi");
  if (!submitterPhone.trim()) missing.push("số điện thoại người gửi");
  if (!confirmAuthority) missing.push("xác nhận có quyền đăng thông tin");
  if (hasContact && !consentPublish) missing.push("đồng ý công khai thông tin liên hệ");
  const valid = missing.length === 0;

  const err = (key: string) => state.errors[key] && <p className={styles.error}>{state.errors[key]}</p>;

  const addService = () => {
    if (services.length >= SERVICES_MAX) return;
    setServices((s) => [...s, { name: "", detail: "" }]);
  };
  const removeService = (i: number) => setServices((s) => s.filter((_, idx) => idx !== i));
  const setService = (i: number, field: keyof ServiceRow, value: string) =>
    setServices((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  if (state.submitted) {
    return (
      <div className={styles.done} role="status">
        <div className={styles.doneIc}>✓</div>
        <h2>Đã nhận hồ sơ</h2>
        <p>
          Chúng tôi sẽ gọi số điện thoại người gửi để xác minh, sau đó hồ sơ mới hiện trên trang. Hồ sơ cũ (nếu có)
          vẫn giữ nguyên cho tới khi duyệt xong.
        </p>
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
        <h2>Doanh nghiệp</h2>
        <p className={styles.sub}>Tên và địa chỉ sẽ được đối chiếu với thông tin đăng ký</p>
        <div className={styles.fld}>
          <label className={styles.lbl} htmlFor="mst">
            Mã số thuế
          </label>
          <input
            id="mst"
            name="mst"
            inputMode="numeric"
            placeholder="10 hoặc 13 số"
            value={mst}
            onChange={(e) => setMst(e.target.value)}
          />
          <MstDigitBoxes hint={hint} />
          <p className={`${styles.hint} ${msg.tone === "ok" ? styles.hintOk : msg.tone === "bad" ? styles.hintBad : ""}`}>
            {msg.text}
          </p>
          {err("mst")}
        </div>
        <div className={styles.fld}>
          <label className={styles.lbl} htmlFor="companyName">
            Tên doanh nghiệp
          </label>
          <input
            id="companyName"
            name="companyName"
            placeholder="Như trên giấy đăng ký"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            maxLength={200}
          />
          {err("companyName")}
        </div>
        <div className={styles.fld}>
          <label className={styles.lbl} htmlFor="address">
            Địa chỉ trụ sở
          </label>
          <input
            id="address"
            name="address"
            placeholder="Số nhà, đường, phường"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={300}
          />
          {err("address")}
        </div>
        <div className={styles.grid2}>
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
          <div className={styles.fld}>
            <label className={styles.lbl} htmlFor="groupSlug">
              Nhóm ngành
            </label>
            <select id="groupSlug" name="groupSlug" value={groupSlug} onChange={(e) => setGroupSlug(e.target.value)}>
              <option value="">Chọn nhóm ngành</option>
              {DIRECTORY_GROUPS.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.label}
                </option>
              ))}
            </select>
            <p className={styles.hint}>Chọn nhóm khách hàng hay tìm nhất.</p>
            {err("groupSlug")}
          </div>
        </div>
      </div>

      <div className={styles.fs}>
        <h2>Giới thiệu</h2>
        <p className={styles.sub}>Phần khách hàng đọc trên trang hồ sơ</p>
        <div className={styles.fld}>
          <label className={styles.lbl} htmlFor="description">
            Mô tả ngắn{" "}
            <span className={styles.count}>
              {description.length}/{DESCRIPTION_MAX}
            </span>
          </label>
          <textarea
            id="description"
            name="description"
            maxLength={DESCRIPTION_MAX}
            placeholder="Doanh nghiệp làm gì, phục vụ ai"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {err("description")}
        </div>
        <span className={styles.lbl}>
          Dịch vụ, sản phẩm <span className={styles.opt}>(tối đa {SERVICES_MAX})</span>
        </span>
        {services.map((row, i) => (
          <div className={styles.svcrow} key={i}>
            <input
              placeholder="Tên dịch vụ"
              aria-label="Tên dịch vụ"
              value={row.name}
              onChange={(e) => setService(i, "name", e.target.value)}
              maxLength={60}
            />
            <input
              placeholder="Mô tả ngắn"
              aria-label="Mô tả ngắn"
              value={row.detail}
              onChange={(e) => setService(i, "detail", e.target.value)}
              maxLength={120}
            />
            <button type="button" className={styles.iconBtn} aria-label="Xóa" onClick={() => removeService(i)}>
              ×
            </button>
          </div>
        ))}
        <div className={dirStyles.act}>
          <button type="button" className={dirStyles.btnGhost + " " + dirStyles.btn} onClick={addService} disabled={services.length >= SERVICES_MAX}>
            Thêm dịch vụ
          </button>
        </div>
        {err("services")}
      </div>

      <div className={styles.fs}>
        <h2>Liên hệ công khai</h2>
        <p className={styles.sub}>Hiện trên trang hồ sơ để khách liên hệ</p>
        <div className={styles.grid2}>
          <div className={styles.fld}>
            <label className={styles.lbl} htmlFor="publicPhone">
              Số điện thoại <span className={styles.opt}>(không bắt buộc)</span>
            </label>
            <input id="publicPhone" name="publicPhone" inputMode="tel" value={publicPhone} onChange={(e) => setPublicPhone(e.target.value)} />
            {err("publicPhone")}
          </div>
          <div className={styles.fld}>
            <label className={styles.lbl} htmlFor="publicZalo">
              Số Zalo <span className={styles.opt}>(không bắt buộc)</span>
            </label>
            <input id="publicZalo" name="publicZalo" inputMode="tel" value={publicZalo} onChange={(e) => setPublicZalo(e.target.value)} />
            {err("publicZalo")}
          </div>
          <div className={styles.fld}>
            <label className={styles.lbl} htmlFor="website">
              Website <span className={styles.opt}>(không bắt buộc)</span>
            </label>
            <input id="website" name="website" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} />
            {err("website")}
          </div>
          <div className={styles.fld}>
            <label className={styles.lbl} htmlFor="publicEmail">
              Email <span className={styles.opt}>(không bắt buộc)</span>
            </label>
            <input id="publicEmail" name="publicEmail" inputMode="email" value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} />
            {err("publicEmail")}
          </div>
        </div>
        <label className={styles.chk}>
          <input
            type="checkbox"
            name="consentPublish"
            checked={consentPublish}
            onChange={(e) => setConsentPublish(e.target.checked)}
          />
          Tôi đồng ý công khai các thông tin liên hệ trên trang masothuedn.com, và có thể yêu cầu gỡ bất cứ lúc nào.
        </label>
        {err("consentPublish")}
      </div>

      <div className={`${styles.fs} ${styles.private}`}>
        <h2>Người gửi</h2>
        <p className={styles.sub}>Không công khai. Chỉ dùng để gọi xác minh.</p>
        <div className={styles.grid2}>
          <div className={styles.fld}>
            <label className={styles.lbl} htmlFor="submitterName">
              Họ và tên
            </label>
            <input id="submitterName" name="submitterName" value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} maxLength={120} />
            {err("submitterName")}
          </div>
          <div className={styles.fld}>
            <label className={styles.lbl} htmlFor="submitterRole">
              Chức vụ
            </label>
            <input
              id="submitterRole"
              name="submitterRole"
              placeholder="Giám đốc, kế toán…"
              value={submitterRole}
              onChange={(e) => setSubmitterRole(e.target.value)}
              maxLength={60}
            />
            {err("submitterRole")}
          </div>
        </div>
        <div className={styles.fld}>
          <label className={styles.lbl} htmlFor="submitterPhone">
            Số điện thoại
          </label>
          <input id="submitterPhone" name="submitterPhone" inputMode="tel" value={submitterPhone} onChange={(e) => setSubmitterPhone(e.target.value)} />
          {err("submitterPhone")}
        </div>
        <label className={styles.chk}>
          <input
            type="checkbox"
            name="confirmAuthority"
            checked={confirmAuthority}
            onChange={(e) => setConfirmAuthority(e.target.checked)}
          />
          Tôi là người đại diện hoặc được doanh nghiệp giao cập nhật thông tin này.
        </label>
        {err("confirmAuthority")}
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="hp_company">Tên công ty (để trống)</label>
        <input id="hp_company" name="hp_company" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <input type="hidden" name="servicesJson" value={JSON.stringify(services.filter((s) => s.name.trim() !== ""))} readOnly />

      {state.message && <p className={styles.error} role="alert">{state.message}</p>}

      <div className={dirStyles.act} style={{ marginTop: 18 }}>
        <button type="submit" className={dirStyles.btn} disabled={!valid || pending}>
          {pending ? "Đang gửi…" : "Gửi hồ sơ"}
        </button>
      </div>
      {!valid && <p className={styles.hint} style={{ textAlign: "center" }}>Cần nhập thêm: {missing.join(", ")}.</p>}
    </form>
  );
}
