// Provenance shown next to every VSIC 2025 / conversion result. Raw files and checksums: data/vsic/raw + data/vsic/vsic-sources.json.
export const VSIC_DATA_CHECKED_AT = "2026-09-21";
export const VSIC_DATA_CHECKED_AT_VN = "21/09/2026";

export const VSIC_2025_LABEL = "VSIC 2025 (Quyết định 36/2025/QĐ-TTg, hiệu lực từ 15/11/2025)";
export const VSIC_2018_LABEL = "VSIC 2018 (Quyết định 27/2018/QĐ-TTg, hết hiệu lực từ 15/11/2025)";

export const VSIC_SOURCES = {
  decision: {
    label: "Quyết định 36/2025/QĐ-TTg, Phụ lục I và II (bản đăng trên Cổng thông tin quốc gia về đăng ký doanh nghiệp)",
    url: "https://dangkykinhdoanh.gov.vn/vn/Pages/ChiTietVanBan.aspx?vID=27045",
  },
  conversion: {
    label: "Bảng chuyển đổi VSIC 2018 - VSIC 2025, kèm Công văn 3061/CTK-CSCL của Cục Thống kê (đăng ngày 26/12/2025)",
    url: "https://www.nso.gov.vn/tin-tuc-thong-ke/2025/12/xay-dung-bang-chuyen-doi-he-thong-nganh-kinh-te-viet-nam/",
  },
} as const;
