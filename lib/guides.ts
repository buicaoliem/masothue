// Guide (/huong-dan) content registry. Adding a guide = one entry here; the page, sitemap, breadcrumb,
// Article JSON-LD and related-link blocks are all generated from it. Only add entries that have been
// reviewed: a guide with a wrong tax rule is worse than no guide.
//
// `published`/`modified` are real editorial dates. Bump `modified` only when the text actually changes.

export type GuideSection = { heading: string; paragraphs: string[] };

export type Guide = {
  slug: string;
  title: string;
  description: string;
  published: string; // YYYY-MM-DD
  modified: string; // YYYY-MM-DD
  intro: string;
  sections: GuideSection[];
  /** Real destinations to continue with: tools, taxonomy hubs, lookup. */
  related: { href: string; label: string }[];
};

export const GUIDES: readonly Guide[] = [
  {
    slug: "ma-so-thue-la-gi",
    title: "Mã số thuế là gì? Cấu trúc và cách tra cứu",
    description: "Mã số thuế (MST) là dãy số định danh người nộp thuế. Cách đọc MST 10 số, 13 số và cách tra cứu thông tin doanh nghiệp theo MST.",
    published: "2026-09-21",
    modified: "2026-09-21",
    intro: "Mã số thuế (MST) là dãy số do cơ quan thuế cấp để định danh người nộp thuế và quản lý thuế. Với doanh nghiệp, đây cũng là mã số doanh nghiệp.",
    sections: [
      {
        heading: "Mã số thuế dùng để làm gì",
        paragraphs: [
          "MST được dùng khi kê khai và nộp thuế, xuất hóa đơn, ký hợp đồng và tra cứu thông tin người nộp thuế. Mỗi người nộp thuế chỉ có một mã số thuế duy nhất và mã này không đổi trong suốt thời gian tồn tại.",
        ],
      },
      {
        heading: "Mã số thuế 10 số và 13 số",
        paragraphs: [
          "MST 10 số cấp cho doanh nghiệp, tổ chức và cá nhân. MST 13 số (10 số, dấu gạch ngang, 3 số) cấp cho đơn vị phụ thuộc như chi nhánh, văn phòng đại diện hay địa điểm kinh doanh; 10 số đầu là mã số thuế của đơn vị chủ quản, 3 số cuối là số thứ tự của đơn vị phụ thuộc.",
          "Chữ số thứ 10 là chữ số kiểm tra, tính từ 9 số đứng trước theo công thức quy định. Bạn có thể dùng công cụ kiểm tra bên dưới để biết một mã số thuế có đúng cấu trúc hay không.",
        ],
      },
      {
        heading: "Cách tra cứu thông tin theo mã số thuế",
        paragraphs: [
          "Nhập mã số thuế vào ô tìm kiếm ở trang chủ để mở hồ sơ doanh nghiệp: tên, địa chỉ, người đại diện, ngành nghề và tình trạng hoạt động. Dữ liệu trên masothuedn.com lấy từ nguồn công khai và có thể chậm hơn so với thay đổi mới nhất; khi cần số liệu chính thức, hãy đối chiếu với cổng thông tin của cơ quan thuế.",
        ],
      },
    ],
    related: [
      { href: "/cong-cu/kiem-tra-ma-so-thue", label: "Công cụ kiểm tra mã số thuế" },
      { href: "/huong-dan/mst-10-so-va-13-so", label: "MST 10 số và 13 số khác nhau thế nào" },
      { href: "/nguon-du-lieu", label: "Nguồn dữ liệu của masothuedn.com" },
    ],
  },
  {
    slug: "mst-10-so-va-13-so",
    title: "Mã số thuế 10 số và 13 số khác nhau thế nào?",
    description: "Phân biệt MST 10 số của doanh nghiệp và MST 13 số của chi nhánh, văn phòng đại diện, địa điểm kinh doanh; cách đọc và kiểm tra hợp lệ.",
    published: "2026-09-21",
    modified: "2026-09-21",
    intro: "Nhìn vào độ dài, có thể biết mã số thuế thuộc doanh nghiệp hay thuộc một đơn vị phụ thuộc của doanh nghiệp đó.",
    sections: [
      {
        heading: "MST 10 số",
        paragraphs: [
          "Là mã số thuế của pháp nhân hoặc cá nhân độc lập, ví dụ công ty cổ phần, công ty TNHH, doanh nghiệp tư nhân, hộ kinh doanh có đăng ký thuế. Với doanh nghiệp, đây cũng là mã số doanh nghiệp ghi trên giấy chứng nhận đăng ký doanh nghiệp.",
        ],
      },
      {
        heading: "MST 13 số",
        paragraphs: [
          "Có dạng XXXXXXXXXX-YYY. Phần XXXXXXXXXX là mã số thuế của đơn vị chủ quản, phần YYY là số thứ tự của đơn vị phụ thuộc như chi nhánh, văn phòng đại diện, địa điểm kinh doanh. Trên masothuedn.com, mã 13 số được tra cứu riêng bằng đúng mã đó.",
        ],
      },
      {
        heading: "Kiểm tra mã có hợp lệ không",
        paragraphs: ["Công cụ kiểm tra mã số thuế xác thực độ dài và chữ số kiểm tra của phần 10 số đầu. Một mã đúng cấu trúc chưa chắc đã tồn tại: cần tra cứu để biết doanh nghiệp có trong dữ liệu hay không."],
      },
    ],
    related: [
      { href: "/cong-cu/kiem-tra-ma-so-thue", label: "Kiểm tra mã số thuế" },
      { href: "/huong-dan/ma-so-thue-la-gi", label: "Mã số thuế là gì" },
    ],
  },
  {
    slug: "kiem-tra-doanh-nghiep-con-hoat-dong",
    title: "Cách kiểm tra doanh nghiệp còn hoạt động hay không",
    description: "Các bước kiểm tra tình trạng hoạt động của doanh nghiệp theo mã số thuế và lưu ý khi dữ liệu công khai chưa kịp cập nhật.",
    published: "2026-09-21",
    modified: "2026-09-21",
    intro: "Trước khi ký hợp đồng hay nhận hóa đơn, nên kiểm tra đối tác còn hoạt động hay đã tạm ngừng, ngừng hoạt động.",
    sections: [
      {
        heading: "Các bước kiểm tra",
        paragraphs: [
          "Bước 1: lấy mã số thuế của đối tác từ hợp đồng hoặc hóa đơn. Bước 2: kiểm tra mã có hợp lệ bằng công cụ kiểm tra. Bước 3: tra cứu hồ sơ doanh nghiệp và đọc mục tình trạng hoạt động cùng ngày cập nhật dữ liệu.",
        ],
      },
      {
        heading: "Các tình trạng thường gặp",
        paragraphs: [
          "Đang hoạt động, tạm ngừng kinh doanh, ngừng hoạt động hoặc giải thể. Danh sách doanh nghiệp theo từng tình trạng có trong mục Tình trạng trên trang.",
          "Dữ liệu công khai được đồng bộ theo chu kỳ nên có thể chậm hơn thực tế. Với giao dịch giá trị lớn, hãy đối chiếu thêm với cơ quan thuế hoặc cổng đăng ký doanh nghiệp.",
        ],
      },
    ],
    related: [
      { href: "/cong-cu/kiem-tra-ma-so-thue", label: "Kiểm tra mã số thuế" },
      { href: "/trang-thai/dang-hoat-dong", label: "Doanh nghiệp đang hoạt động" },
      { href: "/trang-thai/tam-ngung", label: "Doanh nghiệp tạm ngừng" },
      { href: "/phuong-phap-du-lieu", label: "Phương pháp dữ liệu" },
    ],
  },
];

export const findGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);
