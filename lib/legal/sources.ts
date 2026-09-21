// Central registry of legal documents cited by guides and data pages. Guides reference a key from here and never
// hardcode a citation, so when a document is amended or replaced only this file needs an audit.
// Every entry was checked against the official text (CSDL VBPL / Công báo / Cổng đăng ký doanh nghiệp) on `verifiedAt`.
// This is a source check by the editorial team, not a legal opinion or lawyer review.

export type LegalStatus = "in-force" | "amended" | "expired";

export type LegalSource = {
  key: string;
  title: string;
  number: string;
  issuer: string;
  issuedAt: string; // YYYY-MM-DD
  effectiveAt: string; // YYYY-MM-DD
  expiredAt?: string; // YYYY-MM-DD, set when status is "expired"
  status: LegalStatus;
  officialUrl: string;
  replaces?: string[]; // keys
  replacedBy?: string[]; // keys
  amendedBy?: string[]; // keys
  verifiedAt: string; // YYYY-MM-DD
};

export const LEGAL_SOURCES = {
  enterpriseLaw2020: {
    key: "enterpriseLaw2020",
    title: "Luật Doanh nghiệp",
    number: "59/2020/QH14",
    issuer: "Quốc hội",
    issuedAt: "2020-06-17",
    effectiveAt: "2021-01-01",
    status: "amended",
    officialUrl: "https://dangkykinhdoanh.gov.vn/vn/Pages/ChiTietVanBan.aspx?vID=27002",
    amendedBy: ["enterpriseLawAmendment2025"],
    verifiedAt: "2026-09-21",
  },
  enterpriseLawAmendment2025: {
    key: "enterpriseLawAmendment2025",
    title: "Luật sửa đổi, bổ sung một số điều của Luật Doanh nghiệp",
    number: "76/2025/QH15",
    issuer: "Quốc hội",
    issuedAt: "2025-06-17",
    effectiveAt: "2025-07-01",
    status: "in-force",
    officialUrl: "https://dangkykinhdoanh.gov.vn/vn/Pages/ChiTietVanBan.aspx?vID=27042",
    verifiedAt: "2026-09-21",
  },
  businessRegistration2025: {
    key: "businessRegistration2025",
    title: "Nghị định về đăng ký doanh nghiệp",
    number: "168/2025/NĐ-CP",
    issuer: "Chính phủ",
    issuedAt: "2025-06-30",
    effectiveAt: "2025-07-01",
    status: "in-force",
    officialUrl: "https://dangkykinhdoanh.gov.vn/vn/Pages/ChiTietVanBan.aspx?vID=27043",
    replaces: ["businessRegistration2021"],
    verifiedAt: "2026-09-21",
  },
  businessRegistration2021: {
    key: "businessRegistration2021",
    title: "Nghị định về đăng ký doanh nghiệp",
    number: "01/2021/NĐ-CP",
    issuer: "Chính phủ",
    issuedAt: "2021-01-04",
    effectiveAt: "2021-01-04",
    expiredAt: "2025-07-01",
    status: "expired",
    officialUrl: "https://dangkykinhdoanh.gov.vn/vn/Pages/ChiTietVanBan.aspx?vID=27003",
    replacedBy: ["businessRegistration2025"],
    verifiedAt: "2026-09-21",
  },
  vsic2025: {
    key: "vsic2025",
    title: "Quyết định ban hành Hệ thống ngành kinh tế Việt Nam",
    number: "36/2025/QĐ-TTg",
    issuer: "Thủ tướng Chính phủ",
    issuedAt: "2025-09-29",
    effectiveAt: "2025-11-15",
    status: "in-force",
    officialUrl: "https://dangkykinhdoanh.gov.vn/vn/Pages/ChiTietVanBan.aspx?vID=27045",
    replaces: ["vsic2018"],
    verifiedAt: "2026-09-21",
  },
  vsic2018: {
    key: "vsic2018",
    title: "Quyết định ban hành Hệ thống ngành kinh tế Việt Nam",
    number: "27/2018/QĐ-TTg",
    issuer: "Thủ tướng Chính phủ",
    issuedAt: "2018-07-06",
    effectiveAt: "2018-08-20",
    expiredAt: "2025-11-15",
    status: "expired",
    officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=130098",
    replacedBy: ["vsic2025"],
    verifiedAt: "2026-09-21",
  },
} as const satisfies Record<string, LegalSource>;

export type LegalSourceKey = keyof typeof LEGAL_SOURCES;

export const legalSource = (key: LegalSourceKey): LegalSource => LEGAL_SOURCES[key];

const vn = (iso: string) => iso.split("-").reverse().join("/");

/** "Nghị định 01/2021/NĐ-CP (đã hết hiệu lực từ 01/07/2025)": the only way expired documents should be cited. */
export function legalCitation(key: LegalSourceKey): string {
  const s = legalSource(key);
  const kind = s.title.split(" ").slice(0, s.title.startsWith("Luật") ? 2 : 1).join(" ");
  const base = s.title.startsWith("Luật sửa đổi") ? `Luật ${s.number}` : `${kind} ${s.number}`;
  if (s.status === "expired") return `${base} (đã hết hiệu lực từ ${vn(s.expiredAt!)})`;
  return base;
}

export type LegalSourceView = { label: string; url: string; issuer: string; meta: string; statusLabel: string; expired: boolean };

/** Everything a guide's source list shows for one legal document, derived from the registry only. */
export function describeLegalSource(key: LegalSourceKey): LegalSourceView {
  const s = legalSource(key);
  const amendedBy = "amendedBy" in s ? (s.amendedBy as readonly LegalSourceKey[]) : [];
  const replacedBy = "replacedBy" in s ? (s.replacedBy as readonly LegalSourceKey[]) : [];
  const statusLabel =
    s.status === "expired"
      ? `Đã hết hiệu lực từ ${vn(s.expiredAt!)}${replacedBy.length ? `, thay bằng ${replacedBy.map((k) => LEGAL_SOURCES[k].number).join(", ")}` : ""}`
      : s.status === "amended"
        ? `Còn hiệu lực, đã được sửa đổi, bổ sung bởi ${amendedBy.map((k) => LEGAL_SOURCES[k].number).join(", ")}`
        : "Còn hiệu lực";
  return {
    label: `${s.title} số ${s.number}`,
    url: s.officialUrl,
    issuer: s.issuer,
    meta: `Ban hành ${vn(s.issuedAt)}, hiệu lực từ ${vn(s.effectiveAt)}`,
    statusLabel,
    expired: s.status === "expired",
  };
}

export const legalVerifiedAt = (key: LegalSourceKey) => vn(legalSource(key).verifiedAt);
