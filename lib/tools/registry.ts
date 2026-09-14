// Tool catalog for /cong-cu. Adding a tool = one entry here + its folder under app/cong-cu/<slug>.

export type Tool = {
  slug: string;
  name: string;
  /** One line for the catalog card. */
  summary: string;
  /** Meta description of the tool page. */
  description: string;
  /** false = off the catalog and sitemap, and its page answers 404. */
  enabled: boolean;
};

export const TOOLS: Tool[] = [
  {
    slug: "doi-so-thanh-chu",
    name: "Đổi số thành chữ",
    summary: "Đọc số tiền thành chữ tiếng Việt để ghi hóa đơn, phiếu thu chi.",
    description:
      "Đổi số tiền thành chữ tiếng Việt theo cách viết kế toán, ví dụ 1.234.000 thành “Một triệu hai trăm ba mươi tư nghìn đồng”. Sao chép nhanh để ghi hóa đơn, phiếu thu, phiếu chi.",
    enabled: true,
  },
  {
    slug: "tinh-vat",
    name: "Tính thuế GTGT (VAT)",
    summary: "Cộng VAT vào giá chưa thuế hoặc tách VAT từ giá đã gồm thuế.",
    description:
      "Tính thuế giá trị gia tăng với thuế suất 0%, 5%, 8%, 10%: cộng VAT vào giá chưa thuế hoặc tách VAT ra khỏi giá đã gồm thuế. Hiện tiền trước thuế, tiền thuế và tổng thanh toán.",
    enabled: true,
  },
  {
    slug: "tao-vietqr",
    name: "Tạo mã VietQR",
    summary: "Tạo mã QR chuyển khoản ngân hàng theo chuẩn VietQR.",
    description:
      "Tạo mã QR chuyển khoản theo chuẩn VietQR (NAPAS) từ số tài khoản, ngân hàng, số tiền và nội dung. Tải ảnh QR để in lên hóa đơn hoặc gửi cho khách.",
    // Off: chờ mã BIN chuẩn từ NAPAS. lib/tools/banks.ts was written from memory and is unverified.
    enabled: false,
  },
];

export const ENABLED_TOOLS = TOOLS.filter((t) => t.enabled);

export const getTool = (slug: string) => TOOLS.find((t) => t.slug === slug)!;
