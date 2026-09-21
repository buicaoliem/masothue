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
    slug: "tinh-thue-tncn",
    name: "Tính thuế TNCN",
    summary: "Tính thuế thu nhập cá nhân phải nộp mỗi tháng theo biểu thuế lũy tiến 5 bậc và giảm trừ gia cảnh.",
    description:
      "Tính thuế thu nhập cá nhân (TNCN) từ tiền lương, tiền công theo biểu thuế lũy tiến từng phần 5 bậc và mức giảm trừ gia cảnh 2026. Hiện thuế phải nộp/tháng và chi tiết từng bậc thuế.",
    enabled: true,
  },
  {
    slug: "kiem-tra-ma-so-thue",
    name: "Kiểm tra mã số thuế",
    summary: "Kiểm tra mã số thuế 10 hoặc 13 số có hợp lệ không, tra cứu tên doanh nghiệp nếu có trong kho.",
    description:
      "Kiểm tra mã số thuế (MST) 10 số hoặc 13 số có hợp lệ không theo chuẩn chữ số kiểm tra tại Thông tư 105/2020/TT-BTC. Nếu hợp lệ và có trong kho, hiện thêm tên và trạng thái doanh nghiệp.",
    enabled: true,
  },
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
    slug: "tinh-luong",
    name: "Tính lương Gross - Net",
    summary: "Đổi lương Gross sang Net hoặc Net sang Gross, kèm diễn giải bảo hiểm và thuế TNCN.",
    description:
      "Tính lương Gross sang Net hoặc Net sang Gross theo giảm trừ gia cảnh, bảo hiểm bắt buộc (BHXH, BHYT, BHTN) và biểu thuế TNCN lũy tiến từng phần 2026. Diễn giải từng bước: bảo hiểm, giảm trừ, thu nhập tính thuế, thuế theo bậc.",
    enabled: true,
  },
  {
    slug: "tien-cham-nop-thue",
    name: "Tính tiền chậm nộp thuế",
    summary: "Tính tiền chậm nộp thuế theo mức 0,03%/ngày từ hạn nộp đến ngày nộp thực tế.",
    description:
      "Tính tiền chậm nộp thuế theo mức 0,03%/ngày trên số tiền thuế chậm nộp, tính liên tục từ ngày sau hạn nộp đến ngày liền trước ngày nộp thực tế, theo khoản 2 Điều 59 Luật Quản lý thuế 38/2019/QH14.",
    enabled: true,
  },
  {
    slug: "tinh-luong-lam-them-gio",
    name: "Tính lương làm thêm giờ",
    summary: "Tính tiền lương làm thêm giờ theo mức 150%/200%/300% và phụ trội ban đêm.",
    description:
      "Tính tiền lương làm thêm giờ theo mức tối thiểu 150% ngày thường, 200% ngày nghỉ hằng tuần, 300% ngày lễ tết và phụ trội làm việc ban đêm, theo Bộ luật Lao động 2019 và Nghị định 145/2020/NĐ-CP.",
    enabled: true,
  },
  {
    slug: "chuyen-doi-ma-nganh-2018-2025",
    name: "Chuyển đổi mã ngành VSIC 2018 - 2025",
    summary: "Tra mã ngành tương ứng giữa VSIC 2018 và VSIC 2025 theo bảng chuyển đổi chính thức.",
    description:
      "Chuyển đổi mã ngành giữa VSIC 2018 và VSIC 2025 (QĐ 36/2025/QĐ-TTg) theo bảng chuyển đổi chính thức của Cục Thống kê; hiện đủ mã tương ứng khi một mã tách hoặc gộp.",
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
