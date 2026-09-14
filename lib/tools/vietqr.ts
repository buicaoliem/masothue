// VietQR (NAPAS 247 account transfer) payload, built on the EMVCo merchant-presented QR format.
// Every field is ID (2 digits) + length (2 digits) + value; field 63 is a CRC-16/CCITT-FALSE checksum.

const NAPAS_GUID = "A000000727";
const SERVICE_ACCOUNT_TRANSFER = "QRIBFTTA";

export const ACCOUNT_MAX = 19;
export const AMOUNT_MAX_DIGITS = 13;
export const MESSAGE_MAX = 25; // EMVCo "purpose of transaction" limit

export type VietQrInput = { bankBin: string; account: string; amount?: string; message?: string };

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), 4 uppercase hex digits. */
export function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Transfer note as banks accept it: no diacritics, letters/digits/spaces only. */
export function normalizeMessage(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MESSAGE_MAX)
    .trim();
}

export function buildVietQrPayload({ bankBin, account, amount, message }: VietQrInput): string {
  const consumer = tlv("00", bankBin) + tlv("01", account);
  const merchantInfo = tlv("00", NAPAS_GUID) + tlv("01", consumer) + tlv("02", SERVICE_ACCOUNT_TRANSFER);
  const note = message ? normalizeMessage(message) : "";

  let payload =
    tlv("00", "01") +
    tlv("01", amount ? "12" : "11") + // 12 = dynamic (amount set), 11 = static
    tlv("38", merchantInfo) +
    tlv("53", "704") + // VND
    (amount ? tlv("54", amount) : "") +
    tlv("58", "VN") +
    (note ? tlv("62", tlv("08", note)) : "");
  payload += "6304";
  return payload + crc16(payload);
}
