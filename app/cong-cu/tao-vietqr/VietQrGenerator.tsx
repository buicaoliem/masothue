"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { BANKS } from "@/lib/tools/banks";
import { onlyDigits } from "@/lib/tools/number-to-words";
import { formatVnd } from "@/lib/tools/vat";
import {
  ACCOUNT_MAX,
  AMOUNT_MAX_DIGITS,
  buildVietQrPayload,
  MESSAGE_MAX,
  normalizeMessage,
} from "@/lib/tools/vietqr";
import styles from "../tools.module.css";

const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function VietQrGenerator() {
  const [bankBin, setBankBin] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const bank = BANKS.find((b) => b.bin === bankBin);
  const note = normalizeMessage(message);
  const ready = Boolean(bank && account);

  useEffect(() => {
    if (!bank || !account) {
      setQrUrl(null);
      return;
    }
    let stale = false;
    const payload = buildVietQrPayload({ bankBin: bank.bin, account, amount: amount || undefined, message: note });
    QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 2, width: 512 })
      .then((url) => !stale && setQrUrl(url))
      .catch(() => !stale && setQrUrl(null));
    return () => {
      stale = true;
    };
  }, [bank, account, amount, note]);

  return (
    <div className={styles.panel}>
      <div className={styles.field}>
        <label htmlFor="bank" className={styles.label}>
          Ngân hàng
        </label>
        <select id="bank" value={bankBin} onChange={(e) => setBankBin(e.target.value)} className={styles.input}>
          <option value="">Chọn ngân hàng</option>
          {BANKS.map((b) => (
            <option key={b.bin} value={b.bin}>
              {b.shortName} - {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="account" className={styles.label}>
          Số tài khoản
        </label>
        <input
          id="account"
          inputMode="numeric"
          autoComplete="off"
          value={account}
          onChange={(e) => setAccount(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, ACCOUNT_MAX))}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="amount" className={styles.label}>
          Số tiền (đồng, không bắt buộc)
        </label>
        <input
          id="amount"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Để trống để người trả tự nhập"
          value={groupDigits(amount)}
          onChange={(e) => setAmount(onlyDigits(e.target.value).replace(/^0+$/, "").slice(0, AMOUNT_MAX_DIGITS))}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="message" className={styles.label}>
          Nội dung chuyển khoản (không bắt buộc)
        </label>
        <input
          id="message"
          autoComplete="off"
          maxLength={80}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={styles.input}
        />
        <p className={styles.hint}>
          Tối đa {MESSAGE_MAX} ký tự, không dấu, không ký tự đặc biệt.
          {message && ` Nội dung trong mã: “${note}”.`}
        </p>
      </div>

      {ready && qrUrl ? (
        <div className={styles.qrBox}>
          <img src={qrUrl} alt={`Mã VietQR ${bank!.shortName} ${account}`} className={styles.qrImage} />
          <p className={styles.qrCaption}>
            {bank!.shortName} · {account}
            {amount && ` · ${formatVnd(Number(amount))} đ`}
            {note && ` · ${note}`}
          </p>
        </div>
      ) : (
        <p className={`${styles.result} ${styles.empty}`}>Chọn ngân hàng và nhập số tài khoản để tạo mã QR.</p>
      )}

      <div className={styles.actions}>
        {ready && qrUrl ? (
          <a href={qrUrl} download={`vietqr-${bank!.shortName.replace(/\s+/g, "")}-${account}.png`} className={styles.primaryBtn}>
            Tải ảnh QR
          </a>
        ) : (
          <button type="button" className={styles.primaryBtn} disabled>
            Tải ảnh QR
          </button>
        )}
      </div>
    </div>
  );
}
