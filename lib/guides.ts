// Guide (/huong-dan) content registry. Adding a guide = one entry here; the page, sitemap, breadcrumb,
// Article JSON-LD and related-link blocks are all generated from it. Only add entries that have been
// reviewed: a guide with a wrong tax rule is worse than no guide.
//
// `published`/`modified` are real editorial dates. Bump `modified` only when the text actually changes.

import type { LegalSourceKey } from "./legal/sources";

export type GuideTable = { caption: string; head: string[]; rows: string[][] };
/** A table cell that is a site path ("/trang-thai/tam-ngung") renders as an internal link. */
export type GuideSection = { heading: string; paragraphs: string[]; table?: GuideTable };
/** A plain citation/link, or a legal document by key from lib/legal/sources.ts (never hardcode a legal citation in a guide). */
export type GuideSource = { label: string; /** external https URL, or a site path */ url?: string; legal?: undefined } | { legal: LegalSourceKey; /** what this guide relies on it for, e.g. "Điều 8" */ note?: string; label?: undefined; url?: undefined };

export type Guide = {
  slug: string;
  title: string;
  description: string;
  published: string; // YYYY-MM-DD
  modified: string; // YYYY-MM-DD
  /** One or two sentences that answer the query outright; shown first, above the intro. */
  answer?: string;
  intro: string;
  sections: GuideSection[];
  /** Where the facts come from; required reading for anything that states a rule. */
  sources?: GuideSource[];
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
    intro: "Mã số thuế (MST) là dãy số dùng để định danh người nộp thuế và quản lý thuế. Với doanh nghiệp, mã số doanh nghiệp đồng thời là mã số thuế.",
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
          "MST 10 số cấp cho doanh nghiệp, tổ chức và cá nhân. MST 13 số (10 số, dấu gạch ngang, 3 số) cấp cho đơn vị phụ thuộc như chi nhánh, văn phòng đại diện; 10 số đầu là mã số thuế của doanh nghiệp chủ quản, 3 số cuối là số thứ tự của đơn vị phụ thuộc. Địa điểm kinh doanh có mã số riêng gồm 5 chữ số và không phải mã số thuế.",
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
    sources: [
      { legal: "businessRegistration2025", note: "Điều 8: mã số doanh nghiệp, mã số đơn vị phụ thuộc, mã số địa điểm kinh doanh" },
      { label: "Tra cứu thông tin người nộp thuế, Tổng cục Thuế", url: "https://tracuunnt.gdt.gov.vn" },
    ],
    related: [
      { href: "/cong-cu/kiem-tra-ma-so-thue", label: "Công cụ kiểm tra mã số thuế" },
      { href: "/huong-dan/mst-10-so-va-13-so", label: "MST 10 số và 13 số khác nhau thế nào" },
      { href: "/nguon-du-lieu", label: "Nguồn dữ liệu của masothuedn.com" },
      { href: "/huong-dan/ma-so-doanh-nghiep-co-phai-ma-so-thue", label: "Mã số doanh nghiệp có phải mã số thuế không" },
    ],
  },
  {
    slug: "mst-10-so-va-13-so",
    title: "Mã số thuế 10 số và 13 số khác nhau thế nào?",
    description: "Phân biệt MST 10 số của doanh nghiệp và MST 13 số của chi nhánh, văn phòng đại diện; cách đọc và kiểm tra hợp lệ.",
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
          "Có dạng XXXXXXXXXX-YYY. Phần XXXXXXXXXX là mã số thuế của đơn vị chủ quản, phần YYY là số thứ tự của đơn vị phụ thuộc như chi nhánh, văn phòng đại diện. Địa điểm kinh doanh không có MST 13 số: theo Nghị định 168/2025/NĐ-CP, địa điểm kinh doanh có mã số riêng gồm 5 chữ số và đó không phải mã số thuế. Trên masothuedn.com, mã 13 số được tra cứu riêng bằng đúng mã đó.",
        ],
      },
      {
        heading: "Kiểm tra mã có hợp lệ không",
        paragraphs: ["Công cụ kiểm tra mã số thuế xác thực độ dài và chữ số kiểm tra của phần 10 số đầu. Một mã đúng cấu trúc chưa chắc đã tồn tại: cần tra cứu để biết doanh nghiệp có trong dữ liệu hay không."],
      },
    ],
    sources: [{ legal: "businessRegistration2025", note: "Điều 8: mã số đơn vị phụ thuộc, mã số địa điểm kinh doanh" }],
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
      { href: "/huong-dan/trang-thai-hoat-dong-cua-doanh-nghiep", label: "Các tình trạng hoạt động và cách đọc" },
    ],
  },
  {
    slug: "ma-so-doanh-nghiep-co-phai-ma-so-thue",
    title: "Mã số doanh nghiệp có phải là mã số thuế không?",
    description: "Có: với doanh nghiệp, mã số doanh nghiệp ghi trên giấy chứng nhận đăng ký doanh nghiệp cũng dùng làm mã số thuế. Chi nhánh, văn phòng đại diện có mã 13 số riêng.",
    published: "2026-09-21",
    modified: "2026-09-21",
    answer: "Có. Theo Nghị định 168/2025/NĐ-CP, mỗi doanh nghiệp được cấp một mã số duy nhất gọi là mã số doanh nghiệp, đồng thời là mã số thuế của doanh nghiệp; vì vậy tra cứu bằng mã số doanh nghiệp hay mã số thuế đều ra cùng một hồ sơ.",
    intro: "Nhiều người thấy hai cụm từ trên giấy tờ và hóa đơn nên nghĩ đó là hai dãy số khác nhau. Với doanh nghiệp thì không phải vậy.",
    sections: [
      {
        heading: "Một dãy số, hai cách gọi",
        paragraphs: [
          "Khi đăng ký thành lập, doanh nghiệp được cấp mã số doanh nghiệp ghi trên giấy chứng nhận đăng ký doanh nghiệp. Mã này tồn tại trong suốt quá trình hoạt động và không cấp lại cho tổ chức khác. Theo Điều 8 Nghị định 168/2025/NĐ-CP, mã số doanh nghiệp đồng thời là mã số thuế của doanh nghiệp, vì vậy trên hóa đơn, tờ khai và hợp đồng bạn sẽ thấy hai tên gọi cho cùng một số.",
        ],
      },
      {
        heading: "Khi nào có hơn một mã",
        paragraphs: [
          "Chi nhánh và văn phòng đại diện là đơn vị phụ thuộc, có mã số đơn vị phụ thuộc đồng thời là mã số thuế, dạng 13 số XXXXXXXXXX-YYY: 10 số đầu là mã của doanh nghiệp chủ quản, 3 số cuối là số thứ tự của đơn vị phụ thuộc. Địa điểm kinh doanh có mã số riêng gồm 5 chữ số, không phải mã số thuế. Hộ kinh doanh và cá nhân không phải doanh nghiệp nên không có mã số doanh nghiệp; mã số thuế của họ theo quy định về đăng ký thuế.",
        ],
      },
      {
        heading: "Cách kiểm tra nhanh",
        paragraphs: [
          "Lấy mã số trên giấy chứng nhận đăng ký doanh nghiệp hoặc hóa đơn, kiểm tra độ hợp lệ bằng công cụ kiểm tra mã số thuế, rồi mở hồ sơ doanh nghiệp để đối chiếu tên, địa chỉ và tình trạng hoạt động. Dữ liệu trên masothuedn.com lấy từ nguồn công khai; khi cần giá trị pháp lý hãy đối chiếu với cổng thông tin của cơ quan thuế và cổng đăng ký doanh nghiệp quốc gia.",
        ],
      },
    ],
    sources: [
      { legal: "businessRegistration2025", note: "Điều 8: mã số doanh nghiệp là mã số thuế; mã số đơn vị phụ thuộc; mã số địa điểm kinh doanh" },
      { legal: "enterpriseLaw2020", note: "khung pháp lý về doanh nghiệp; chi tiết mã số nằm ở nghị định về đăng ký doanh nghiệp" },
      { legal: "enterpriseLawAmendment2025", note: "sửa đổi, bổ sung Luật Doanh nghiệp 2020" },
      { legal: "businessRegistration2021", note: "chỉ nêu để phân biệt: không còn là căn cứ áp dụng" },
      { label: "Cổng thông tin đăng ký doanh nghiệp quốc gia", url: "https://dangkykinhdoanh.gov.vn" },
      { label: "Tra cứu thông tin người nộp thuế, Tổng cục Thuế", url: "https://tracuunnt.gdt.gov.vn" },
    ],
    related: [
      { href: "/cong-cu/kiem-tra-ma-so-thue", label: "Kiểm tra mã số thuế" },
      { href: "/huong-dan/mst-10-so-va-13-so", label: "MST 10 số và 13 số khác nhau thế nào" },
      { href: "/huong-dan/ma-so-thue-la-gi", label: "Mã số thuế là gì" },
      { href: "/", label: "Tra cứu doanh nghiệp theo mã số thuế" },
    ],
  },
  {
    slug: "trang-thai-hoat-dong-cua-doanh-nghiep",
    title: "Các tình trạng hoạt động của doanh nghiệp và cách đọc",
    description: "Đang hoạt động, tạm ngừng kinh doanh, giải thể, không còn hoạt động tại địa chỉ đăng ký, bị thu hồi giấy chứng nhận: cách các nguồn công khai ghi và cách đọc trên hồ sơ doanh nghiệp.",
    published: "2026-09-21",
    modified: "2026-09-21",
    answer: "Tình trạng là chữ do nguồn dữ liệu công khai ghi ở thời điểm công bố. Mỗi hồ sơ trên masothuedn.com hiển thị đúng chữ đó kèm ngày dữ liệu; tình trạng có thể đã thay đổi sau ngày này.",
    intro: "Trước khi ký hợp đồng hoặc nhận hóa đơn, bạn thường cần biết đối tác còn hoạt động không. Các nguồn dùng những cách ghi khác nhau, bảng dưới đây gom lại các cách ghi thường gặp trong dữ liệu của chúng tôi.",
    sections: [
      {
        heading: "Các cách ghi thường gặp",
        paragraphs: ["Bảng liệt kê cách ghi trong nguồn, không phải diễn giải pháp lý. Cột cuối là trang danh sách tương ứng trên masothuedn.com."],
        table: {
          caption: "Cách ghi tình trạng trong dữ liệu và trang danh sách tương ứng",
          head: ["Cách ghi trong nguồn", "Nhóm hiển thị trên trang", "Trang danh sách"],
          rows: [
            ["Đang hoạt động; NNT đang hoạt động", "Đang hoạt động", "/trang-thai/dang-hoat-dong"],
            ["Tạm ngừng kinh doanh", "Tạm ngừng", "/trang-thai/tam-ngung"],
            ["Đã giải thể, phá sản, chấm dứt tồn tại", "Ngừng hoạt động, giải thể, bị thu hồi", "/trang-thai/ngung-hoat-dong"],
            ["Không còn hoạt động kinh doanh tại địa chỉ đã đăng ký", "Ngừng hoạt động, giải thể, bị thu hồi", "/trang-thai/ngung-hoat-dong"],
            ["Bị thu hồi giấy chứng nhận đăng ký doanh nghiệp do cưỡng chế về quản lý thuế", "Ngừng hoạt động, giải thể, bị thu hồi", "/trang-thai/ngung-hoat-dong"],
            ["Đang làm thủ tục giải thể, đã bị chia, bị hợp nhất, bị sáp nhập", "Ngừng hoạt động, giải thể, bị thu hồi", "/trang-thai/ngung-hoat-dong"],
          ],
        },
      },
      {
        heading: "Vì sao tình trạng có thể lệch thực tế",
        paragraphs: [
          "Dữ liệu được đồng bộ theo đợt từ nguồn công khai, không theo thời gian thực. Doanh nghiệp vừa tạm ngừng hoặc vừa phục hồi có thể chưa được cập nhật. Mỗi hồ sơ hiển thị ngày dữ liệu của nguồn (hoặc thời điểm hệ thống đồng bộ gần nhất) để bạn biết mình đang xem dữ liệu tại thời điểm nào.",
        ],
      },
      {
        heading: "Nên làm gì với giao dịch giá trị lớn",
        paragraphs: [
          "Đối chiếu thêm trên cổng thông tin của cơ quan thuế và cổng đăng ký doanh nghiệp quốc gia, và yêu cầu đối tác cung cấp giấy chứng nhận đăng ký doanh nghiệp còn hiệu lực. masothuedn.com là công cụ tra cứu nhanh, không thay thế xác nhận chính thức.",
        ],
      },
    ],
    sources: [
      { label: "Cổng thông tin đăng ký doanh nghiệp quốc gia", url: "https://dangkykinhdoanh.gov.vn" },
      { label: "Tra cứu thông tin người nộp thuế, Tổng cục Thuế", url: "https://tracuunnt.gdt.gov.vn" },
      { label: "Nguồn dữ liệu của masothuedn.com", url: "/nguon-du-lieu" },
    ],
    related: [
      { href: "/trang-thai/dang-hoat-dong", label: "Doanh nghiệp đang hoạt động" },
      { href: "/trang-thai/tam-ngung", label: "Doanh nghiệp tạm ngừng" },
      { href: "/trang-thai/ngung-hoat-dong", label: "Doanh nghiệp ngừng hoạt động, giải thể" },
      { href: "/huong-dan/kiem-tra-doanh-nghiep-con-hoat-dong", label: "Cách kiểm tra doanh nghiệp còn hoạt động" },
      { href: "/cong-cu/kiem-tra-ma-so-thue", label: "Kiểm tra mã số thuế" },
    ],
  },
  {
    slug: "ma-nganh-kinh-te-la-gi",
    title: "Mã ngành kinh tế (VSIC) là gì? Cấu trúc và cách đọc",
    description: "Hệ thống ngành kinh tế Việt Nam theo Quyết định 36/2025/QĐ-TTg gồm 5 cấp, 22 ngành cấp 1 (A đến V). Cách đọc mã ngành, điểm khác so với hệ 2018 và cách tra doanh nghiệp theo mã ngành.",
    published: "2026-09-21",
    modified: "2026-09-21",
    answer: "Mã ngành kinh tế là dãy số phân loại hoạt động kinh tế theo Hệ thống ngành kinh tế Việt Nam. Hệ thống hiện hành là Quyết định 36/2025/QĐ-TTg (hiệu lực từ 15/11/2025, thay Quyết định 27/2018/QĐ-TTg). Dữ liệu ngành trên masothuedn.com hiện vẫn theo mã của hệ 2018 như nguồn công bố, xem mục cuối bài.",
    intro: "Khi mở hồ sơ doanh nghiệp bạn sẽ gặp các mã như 4669 hay 6201 kèm tên ngành. Đó là mã trong hệ thống ngành kinh tế quốc gia, nhưng cần biết mã đó thuộc phiên bản nào: hệ 2018 và hệ 2025 có nhiều mã khác nhau.",
    sections: [
      {
        heading: "Cấu trúc năm cấp theo Quyết định 36/2025/QĐ-TTg",
        paragraphs: ["Hệ thống hiện hành chia ngành thành năm cấp, càng xuống dưới càng chi tiết: 22 ngành cấp 1 (chữ cái A đến V), 87 ngành cấp 2, 259 ngành cấp 3, 495 ngành cấp 4 và 743 ngành cấp 5. Mã dài hơn nằm trong mã ngắn hơn có cùng phần đầu."],
        table: {
          caption: "Các cấp của hệ thống ngành kinh tế Việt Nam (Quyết định 36/2025/QĐ-TTg)",
          head: ["Cấp", "Cách ký hiệu", "Ví dụ"],
          rows: [
            ["Cấp 1", "Một chữ cái (A đến V), 22 ngành", "K: Hoạt động viễn thông; lập trình máy tính, tư vấn, cơ sở hạ tầng máy tính và các dịch vụ thông tin khác"],
            ["Cấp 2", "2 chữ số, 87 ngành", "62: Lập trình máy tính, dịch vụ tư vấn và các hoạt động liên quan"],
            ["Cấp 3", "3 chữ số, 259 ngành", "621: Lập trình máy tính"],
            ["Cấp 4", "4 chữ số, 495 ngành", "6219: Lập trình máy tính khác"],
            ["Cấp 5", "5 chữ số, 743 ngành", "62190: Lập trình máy tính khác"],
          ],
        },
      },
      {
        heading: "Khác gì so với hệ 2018",
        paragraphs: [
          "Quyết định 27/2018/QĐ-TTg (hệ 2018) có 21 ngành cấp 1 (A đến U), 88 ngành cấp 2, 242 ngành cấp 3, 486 ngành cấp 4 và 734 ngành cấp 5. Hệ 2025 thêm một ngành cấp 1, đổi tổ chức nhiều nhóm và không dùng lại một số mã cũ. Ví dụ mã 6201 (Lập trình máy vi tính) và 4669 (Bán buôn chuyên doanh khác chưa được phân vào đâu) của hệ 2018 không còn trong danh mục 2025. Có mã giữ nguyên số nhưng đổi tên hoặc đổi phạm vi, nên không thể chuyển đổi bằng cách so số mã.",
        ],
      },
      {
        heading: "Cách đọc mã ngành trên hồ sơ doanh nghiệp",
        paragraphs: [
          "Một doanh nghiệp có thể đăng ký nhiều mã ngành. Việc một mã xuất hiện trong hồ sơ cho biết doanh nghiệp đã đăng ký ngành đó, chưa nói doanh nghiệp đang thực sự hoạt động chính ở đó. Cách hiển thị ngành chính và ngành đăng ký trên masothuedn.com được giải thích ở bài phân biệt hai khái niệm này.",
        ],
      },
      {
        heading: "Mã ngành trong dữ liệu masothuedn.com theo hệ nào",
        paragraphs: [
          "Các nguồn dữ liệu mở mà chúng tôi dùng (TP. Hồ Chí Minh, Sơn La, Quảng Ngãi) không ghi rõ phiên bản hệ thống ngành. Đối chiếu nội dung cho thấy mã trong các nguồn này khớp hệ 2018: có mã chỉ tồn tại ở hệ 2018 và không thấy mã chỉ có ở hệ 2025. Vì vậy chúng tôi hiển thị mã và tên ngành đúng như nguồn công bố và không tự chuyển sang mã 2025. Khi cần đăng ký hoặc kê khai theo hệ hiện hành, hãy tra mã trong Quyết định 36/2025/QĐ-TTg.",
        ],
      },
      {
        heading: "Tra doanh nghiệp theo mã ngành",
        paragraphs: ["Trang ngành nghề liệt kê các mã có nhiều doanh nghiệp trong dữ liệu; chọn một mã để xem doanh nghiệp đăng ký ngành đó và phân bố theo tỉnh, thành phố."],
      },
    ],
    sources: [
      { legal: "vsic2025", note: "Phụ lục I (danh mục) và Phụ lục II (nội dung ngành)" },
      { legal: "vsic2018", note: "chỉ nêu để so sánh và để giải thích dữ liệu nguồn; không còn là hệ thống hiện hành" },
      { label: "Cổng thông tin đăng ký doanh nghiệp quốc gia", url: "https://dangkykinhdoanh.gov.vn" },
      { label: "Nguồn dữ liệu của masothuedn.com", url: "/nguon-du-lieu" },
    ],
    related: [
      { href: "/nganh", label: "Tra cứu doanh nghiệp theo ngành nghề" },
      { href: "/huong-dan/nganh-nghe-chinh-va-nganh-nghe-dang-ky", label: "Ngành nghề chính và ngành nghề đăng ký" },
      { href: "/huong-dan/cach-tra-cuu-ma-nganh-cua-doanh-nghiep", label: "Cách tra cứu mã ngành của doanh nghiệp" },
      { href: "/thong-ke/doanh-nghiep-viet-nam", label: "Thống kê doanh nghiệp" },
    ],
  },
  {
    slug: "nganh-nghe-chinh-va-nganh-nghe-dang-ky",
    title: "Ngành nghề chính và ngành nghề đăng ký khác nhau thế nào?",
    description: "Ngành nghề đăng ký là mọi ngành doanh nghiệp đã đăng ký; ngành chính chỉ có khi nguồn dữ liệu nêu rõ. Cách masothuedn.com hiển thị hai loại này và vì sao không suy đoán ngành chính.",
    published: "2026-09-21",
    modified: "2026-09-21",
    answer: "Ngành nghề đăng ký là danh sách các ngành doanh nghiệp đã đăng ký kinh doanh, có thể rất dài. Ngành chính là một ngành trong danh sách đó mà nguồn dữ liệu nêu rõ; nếu nguồn không nêu, masothuedn.com ghi là chưa rõ thay vì đoán.",
    intro: "Hai khái niệm này hay bị nhầm khi xem hồ sơ doanh nghiệp hoặc trang thống kê theo ngành.",
    sections: [
      {
        heading: "Ba thuật ngữ hay bị lẫn",
        paragraphs: [
          "“Ngành, nghề kinh doanh” là cách gọi trong hồ sơ đăng ký doanh nghiệp: những ngành, nghề doanh nghiệp đăng ký, ghi bằng mã trong Hệ thống ngành kinh tế Việt Nam. “Ngành kinh tế” là mã và tên trong chính hệ thống đó (hiện hành là Quyết định 36/2025/QĐ-TTg). “Ngành chính” trên masothuedn.com chỉ là một trường của nguồn dữ liệu: khi nguồn đánh dấu một ngành là chính thì chúng tôi hiển thị, và chúng tôi không khẳng định đó là một loại ngành do pháp luật quy định riêng.",
        ],
      },
      {
        heading: "Khác biệt cơ bản",
        paragraphs: ["Đăng ký một ngành không có nghĩa doanh nghiệp đang hoạt động chính ở ngành đó. Nhiều doanh nghiệp đăng ký hàng chục mã ngành để có thể kinh doanh linh hoạt về sau."],
        table: {
          caption: "Ngành nghề đăng ký và ngành nghề chính trong dữ liệu masothuedn.com",
          head: ["", "Ngành nghề đăng ký", "Ngành nghề chính"],
          rows: [
            ["Ý nghĩa", "Mọi ngành đã đăng ký trong hồ sơ", "Một ngành nguồn xác định là chính"],
            ["Số lượng mỗi doanh nghiệp", "Từ một đến hàng chục", "Tối đa một"],
            ["Luôn có trong dữ liệu", "Có, khi nguồn công bố danh sách ngành", "Không: chỉ khi nguồn nêu rõ"],
            ["Cách hiển thị", "Mục “Ngành nghề đăng ký”", "Mục “Ngành nghề chính”"],
          ],
        },
      },
      {
        heading: "Vì sao có hồ sơ không có ngành chính",
        paragraphs: [
          "Một số nguồn dữ liệu mở chỉ công bố danh sách ngành đã đăng ký theo thứ tự không có ý nghĩa, không đánh dấu ngành chính. Với các hồ sơ đó chúng tôi chỉ hiển thị “Ngành nghề đăng ký” và ghi rõ nguồn không cho biết ngành chính. Chúng tôi không lấy ngành đầu tiên, ngành phổ biến nhất hay suy đoán từ tên công ty để điền vào.",
        ],
      },
      {
        heading: "Ảnh hưởng đến các trang thống kê",
        paragraphs: [
          "Trang ngành nghề và trang thống kê luôn tách hai số: số doanh nghiệp có đăng ký ngành và số doanh nghiệp lấy ngành đó làm ngành chính. Một ngành xuất hiện ở hàng chục nghìn hồ sơ đăng ký chưa chắc là ngành có nhiều doanh nghiệp hoạt động chính nhất.",
        ],
      },
    ],
    sources: [
      { legal: "vsic2025", note: "hệ thống ngành kinh tế hiện hành" },
      { label: "Nguồn dữ liệu của masothuedn.com", url: "/nguon-du-lieu" },
      { label: "Phương pháp dữ liệu", url: "/phuong-phap-du-lieu" },
    ],
    related: [
      { href: "/nganh", label: "Tra cứu doanh nghiệp theo ngành nghề" },
      { href: "/thong-ke/doanh-nghiep-viet-nam", label: "Thống kê doanh nghiệp" },
      { href: "/huong-dan/ma-nganh-kinh-te-la-gi", label: "Mã ngành kinh tế là gì" },
      { href: "/nguon-du-lieu", label: "Nguồn dữ liệu" },
    ],
  },
  {
    slug: "cach-tra-cuu-ma-nganh-cua-doanh-nghiep",
    title: "Cách tra cứu mã ngành của một doanh nghiệp",
    description: "Tra cứu mã ngành và ngành nghề đăng ký của doanh nghiệp theo mã số thuế, và ngược lại tìm doanh nghiệp theo mã ngành, tại tỉnh hoặc thành phố cụ thể.",
    published: "2026-09-21",
    modified: "2026-09-21",
    answer: "Nhập mã số thuế vào ô tìm kiếm để mở hồ sơ, xem mục “Ngành nghề chính” hoặc “Ngành nghề đăng ký”. Muốn làm ngược lại, mở trang Ngành nghề, chọn mã ngành rồi lọc theo tỉnh, thành phố.",
    intro: "Có hai hướng tra cứu: từ doanh nghiệp ra mã ngành, và từ mã ngành ra danh sách doanh nghiệp.",
    sections: [
      {
        heading: "Từ doanh nghiệp đến mã ngành",
        paragraphs: [
          "Bước 1: nhập mã số thuế 10 số hoặc 13 số vào ô tìm kiếm ở trang chủ. Bước 2: trong hồ sơ, đọc mục ngành nghề. Nếu có “Ngành nghề chính”, đó là ngành nguồn dữ liệu xác định là chính; mục “Ngành nghề đăng ký” liệt kê các ngành còn lại. Bước 3: bấm vào mã ngành để xem các doanh nghiệp khác cùng ngành.",
        ],
      },
      {
        heading: "Từ mã ngành đến danh sách doanh nghiệp",
        paragraphs: [
          "Trang mỗi mã ngành cho biết bao nhiêu doanh nghiệp đăng ký ngành đó, bao nhiêu doanh nghiệp lấy làm ngành chính (nếu nguồn có), phân bố theo tỉnh, thành phố và các ngành liên quan cùng nhóm. Với ngành có nhiều doanh nghiệp ở một tỉnh, có trang riêng cho ngành đó tại tỉnh.",
        ],
      },
      {
        heading: "Lưu ý về độ đầy đủ",
        paragraphs: [
          "Dữ liệu ngành phụ thuộc nguồn công khai của từng địa phương nên chưa phải mọi doanh nghiệp đều có. Hồ sơ nào chưa có dữ liệu ngành sẽ ghi “Chưa có dữ liệu”. Mã ngành hiển thị đúng như nguồn công bố, hiện theo hệ thống ngành 2018; hệ hiện hành từ 15/11/2025 là Quyết định 36/2025/QĐ-TTg và có mã khác. Để có ngành nghề chính thức, hãy xem giấy chứng nhận đăng ký doanh nghiệp hoặc cổng đăng ký doanh nghiệp quốc gia.",
        ],
      },
    ],
    sources: [
      { legal: "vsic2025", note: "hệ thống ngành kinh tế hiện hành" },
      { label: "Cổng thông tin đăng ký doanh nghiệp quốc gia", url: "https://dangkykinhdoanh.gov.vn" },
      { label: "Nguồn dữ liệu của masothuedn.com", url: "/nguon-du-lieu" },
    ],
    related: [
      { href: "/nganh", label: "Tra cứu doanh nghiệp theo ngành nghề" },
      { href: "/", label: "Tra cứu doanh nghiệp theo mã số thuế" },
      { href: "/huong-dan/ma-nganh-kinh-te-la-gi", label: "Mã ngành kinh tế là gì" },
      { href: "/huong-dan/nganh-nghe-chinh-va-nganh-nghe-dang-ky", label: "Ngành nghề chính và ngành nghề đăng ký" },
      { href: "/tinh/ho-chi-minh", label: "Doanh nghiệp tại TP. Hồ Chí Minh" },
    ],
  },
];

export const findGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);
