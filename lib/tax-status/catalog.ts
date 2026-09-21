// Danh mục trạng thái mã số thuế, Phụ lục I của Thông tư 90/2026/TT-BTC (Bộ Tài chính, ký 30/06/2026, hiệu lực 01/07/2026,
// thay thế Thông tư 86/2024/TT-BTC). Transcribed by hand from the signed official PDF (pages "Phụ lục I", 6 pages);
// the scan has no text layer. Raw file + checksum: data/tax-status/raw/tt90-2026-btc.signed.pdf, sha256
// cf5949e7c8bc9129923f29f999686dcccbabd94dc31cbf5f490bd905a0e9194c, downloaded 2026-09-21 from datafiles.chinhphu.vn.
//
// Statuses are NOT mapped to Company.status: the company data uses free text from other sources (see lib/company-status.ts)
// and no explicit, proven mapping exists. Reference pages therefore stand alone.

import type { LegalSourceKey } from "@/lib/legal/sources";

export type TaxStatusReason = { code: string; name: string; content: string };

export type TaxStatusDefinition = {
  /** Two-digit status code exactly as in the official list. */
  code: string;
  officialName: string;
  /** Plain-language reading; stays within the official wording. */
  explanation: string;
  /** "in-force" = usable status; "void" = the Thông tư lists the code but marks its content "Hết hiệu lực". */
  effectiveStatus: "in-force" | "void";
  legalSource: LegalSourceKey;
  /** The Thông tư does not split the list by taxpayer type; reasons mention the types where a reason applies to one. */
  applicability: string;
  reasons: TaxStatusReason[];
  /** Reference detail page (search intent + enough content). Others live only on the /trang-thai list. */
  detailSlug?: string;
  /** What a reader can check. Generic, not personal advice. */
  whatToCheck?: string[];
};

const S = "taxRegistration2026" as const;

export const TAX_STATUS_LIST_TITLE = "Danh mục trạng thái mã số thuế (Phụ lục I, Thông tư 90/2026/TT-BTC)";

export const TAX_STATUSES: readonly TaxStatusDefinition[] = [
  {
    code: "00",
    officialName: "NNT đã được cấp MST",
    explanation: "Người nộp thuế đã được cấp mã số thuế. Thông tin chi tiết cho biết đã hoạt động sản xuất kinh doanh hay chưa, hoặc là cá nhân chưa phát sinh nghĩa vụ thuế.",
    effectiveStatus: "in-force",
    legalSource: S,
    applicability: "Áp dụng chung; lý do 03 dành cho cá nhân.",
    detailSlug: "00-nnt-dang-hoat-dong",
    reasons: [
      { code: "01", name: "Chưa đi vào hoạt động", content: "NNT đã được cấp MST nhưng chưa đi vào hoạt động sản xuất kinh doanh" },
      { code: "02", name: "Đang hoạt động", content: "NNT đã được cấp MST và đã có hoạt động sản xuất kinh doanh" },
      { code: "03", name: "Cá nhân chưa phát sinh nghĩa vụ thuế", content: "Cá nhân đã được cấp MST người phụ thuộc hoặc đã được cấp số định danh cá nhân nhưng chưa phát sinh nghĩa vụ thuế" },
    ],
    whatToCheck: [
      "Trạng thái 00 chỉ cho biết mã số thuế đã được cấp và đang trong trạng thái sử dụng; lý do chi tiết mới cho biết đã hoạt động hay chưa.",
      "Đối chiếu tên, địa chỉ và ngành nghề với giấy chứng nhận đăng ký của đối tác.",
      "Tra cứu lại trên cổng của cơ quan thuế ngay trước giao dịch lớn, vì trạng thái có thể thay đổi.",
    ],
  },
  {
    code: "01",
    officialName: "NNT ngừng hoạt động và đã hoàn thành thủ tục chấm dứt hiệu lực MST",
    explanation: "Mã số thuế đã chấm dứt hiệu lực sau khi hoàn thành thủ tục. Lý do nêu nguyên nhân: tổ chức lại, cá nhân chết hoặc mất tích, giải thể, phá sản, hoặc là tổ chức, hộ kinh doanh, cá nhân kinh doanh chấm dứt.",
    effectiveStatus: "in-force",
    legalSource: S,
    applicability: "Áp dụng chung; các lý do 04, 18, 21 dành cho cá nhân, hộ kinh doanh, cá nhân kinh doanh.",
    reasons: [
      { code: "03", name: "Tổ chức lại doanh nghiệp, tổ chức khác (chia, sáp nhập, hợp nhất)", content: "NNT chấm dứt hoạt động trong trường hợp tổ chức lại doanh nghiệp, tổ chức kinh tế và tổ chức khác (chia, sáp nhập, hợp nhất)" },
      { code: "04", name: "Cá nhân chết, mất tích, mất năng lực hành vi dân sự", content: "Cá nhân bị chết, mất tích, mất năng lực hành vi dân sự" },
      { code: "07", name: "Giải thể/chấm dứt hoạt động đối với doanh nghiệp, hợp tác xã (bao gồm đơn vị phụ thuộc, địa điểm kinh doanh)", content: "Doanh nghiệp, hợp tác xã đã giải thể; đơn vị phụ thuộc, địa điểm kinh doanh của doanh nghiệp, hợp tác xã đã chấm dứt hoạt động" },
      { code: "08", name: "Đã phá sản", content: "Doanh nghiệp, hợp tác xã đã phá sản" },
      { code: "18", name: "Là tổ chức khác, hộ kinh doanh, cá nhân kinh doanh", content: "Tổ chức khác không phải là doanh nghiệp, hợp tác xã; hộ kinh doanh, cá nhân kinh doanh đã hoàn thành thủ tục chấm dứt hiệu lực mã số thuế" },
      { code: "21", name: "Là hộ kinh doanh chuyển lên doanh nghiệp nhỏ và vừa", content: "Hộ kinh doanh đã chuyển lên doanh nghiệp nhỏ và vừa theo Luật hỗ trợ doanh nghiệp nhỏ và vừa" },
    ],
  },
  {
    code: "02",
    officialName: "NNT đã chuyển cơ quan thuế quản lý (chờ CQT nơi đến nhận)",
    explanation: "Người nộp thuế đã hoàn thành thủ tục tại cơ quan thuế nơi đi nhưng chưa đăng ký với cơ quan thuế hoặc cơ quan đăng ký kinh doanh, cơ quan đăng ký hợp tác xã nơi chuyển đến.",
    effectiveStatus: "in-force",
    legalSource: S,
    applicability: "Áp dụng chung.",
    reasons: [{ code: "01", name: "", content: "NNT đã hoàn thành thủ tục thuế tại cơ quan thuế nơi đi nhưng chưa đăng ký với cơ quan thuế hoặc cơ quan đăng ký kinh doanh, cơ quan đăng ký hợp tác xã nơi chuyển đến" }],
  },
  {
    code: "03",
    officialName: "NNT ngừng hoạt động nhưng chưa hoàn thành thủ tục chấm dứt hiệu lực MST",
    explanation: "Người nộp thuế đã ngừng hoạt động hoặc đang làm thủ tục chấm dứt nhưng mã số thuế chưa chấm dứt hiệu lực: còn chờ xác nhận, chờ giải thể, chưa hoàn thành nghĩa vụ thuế hoặc còn vướng một điều kiện khác.",
    effectiveStatus: "in-force",
    legalSource: S,
    applicability: "Áp dụng chung; các lý do 04, 19, 21 dành cho cá nhân, hộ kinh doanh, cá nhân kinh doanh; lý do 17 dành cho đơn vị phụ thuộc, mã số nộp thay.",
    detailSlug: "03-nnt-ngung-hoat-dong-chua-cham-dut-mst",
    reasons: [
      { code: "03", name: "Tổ chức lại doanh nghiệp, tổ chức khác (chia, sáp nhập, hợp nhất)", content: "NNT đang làm thủ tục chấm dứt hiệu lực MST khi chấm dứt hoạt động do tổ chức lại doanh nghiệp, tổ chức kinh tế và tổ chức khác (chia, sáp nhập, hợp nhất)" },
      { code: "04", name: "Cá nhân chết, mất tích, mất năng lực hành vi dân sự", content: "Cá nhân bị chết, mất tích, mất năng lực hành vi dân sự nhưng chưa hoàn thành nghĩa vụ với ngân sách nhà nước" },
      { code: "07", name: "Chờ xác nhận chấm dứt của CQĐKKD", content: "DN, HTX, HKD đã hoàn thành thủ tục với CQT nhưng chưa nhận được giao dịch xác nhận chấm dứt của CQĐKKD" },
      { code: "11", name: "Chờ làm thủ tục giải thể/chấm dứt hoạt động đối với doanh nghiệp, hợp tác xã (bao gồm đơn vị phụ thuộc, địa điểm kinh doanh)", content: "Doanh nghiệp, hợp tác xã đang làm thủ tục chấm dứt hiệu lực mã số thuế để thực hiện giải thể; đơn vị phụ thuộc, địa điểm kinh doanh đang làm thủ tục chấm dứt hiệu lực mã số thuế để chấm dứt hoạt động" },
      { code: "12", name: "Đã phá sản nhưng chưa hoàn thành nghĩa vụ thuế", content: "Doanh nghiệp, hợp tác xã đã bị Tòa án có Quyết định tuyên bố phá sản nhưng chưa hoàn thành nghĩa vụ nộp thuế" },
      { code: "13", name: "Bị thu hồi Giấy phép hoạt động do vi phạm pháp luật", content: "NNT bị cơ quan có thẩm quyền thu hồi giấy phép hoạt động do vi phạm pháp luật nhưng chưa hoàn thành thủ tục chấm dứt hiệu lực MST" },
      { code: "15", name: "Bị thu hồi Giấy phép hoạt động do cưỡng chế nợ thuế", content: "NNT bị áp dụng biện pháp cưỡng chế nợ thuế quy định của Luật Quản lý thuế" },
      { code: "17", name: "Là đơn vị phụ thuộc, mã số nộp thay có đơn vị chủ quản đang làm thủ tục chấm dứt hiệu lực mã số thuế", content: "NNT là đơn vị phụ thuộc, mã số nộp thay có đơn vị chủ quản đang làm thủ tục chấm dứt hiệu lực mã số thuế" },
      { code: "19", name: "Là tổ chức khác, hộ kinh doanh, cá nhân kinh doanh chưa hoàn thành thủ tục chấm dứt hiệu lực mã số thuế", content: "Người nộp thuế là tổ chức khác, hộ kinh doanh, cá nhân kinh doanh đang làm thủ tục chấm dứt hiệu lực mã số thuế để chấm dứt hoạt động, kinh doanh" },
      { code: "21", name: "Là hộ kinh doanh chuyển lên doanh nghiệp nhỏ và vừa", content: "Người nộp thuế là hộ kinh doanh, cá nhân kinh doanh đang làm thủ tục chấm dứt hiệu lực mã số thuế để chuyển lên doanh nghiệp nhỏ và vừa" },
    ],
    whatToCheck: [
      "Đọc lý do chi tiết: 'ngừng hoạt động' ở đây có thể do giải thể đang làm thủ tục, thu hồi giấy phép, cưỡng chế nợ thuế hoặc phá sản chưa xong nghĩa vụ thuế; mỗi lý do có hệ quả khác nhau.",
      "Không suy ra doanh nghiệp đã giải thể xong: mã số thuế chưa chấm dứt hiệu lực.",
      "Với giao dịch đang thực hiện, yêu cầu đối tác cung cấp văn bản của cơ quan thuế hoặc cơ quan đăng ký kinh doanh về tình trạng hiện tại.",
    ],
  },
  {
    code: "04",
    officialName: "NNT đang hoạt động (áp dụng cho hộ kinh doanh, cá nhân kinh doanh chưa đủ thông tin đăng ký thuế)",
    explanation: "Thông tư 90/2026/TT-BTC vẫn liệt kê mã 04 nhưng ghi nội dung là “Hết hiệu lực”: đây không phải trạng thái đang sử dụng.",
    effectiveStatus: "void",
    legalSource: S,
    applicability: "Từng áp dụng cho hộ kinh doanh, cá nhân kinh doanh chưa đủ thông tin đăng ký thuế; nay ghi “Hết hiệu lực”.",
    reasons: [],
  },
  {
    code: "05",
    officialName: "NNT tạm ngừng hoạt động, kinh doanh",
    explanation: "Người nộp thuế được phép tạm ngừng hoạt động, kinh doanh trong thời hạn đã được cơ quan thuế hoặc cơ quan có thẩm quyền chấp thuận.",
    effectiveStatus: "in-force",
    legalSource: S,
    applicability: "Áp dụng chung.",
    detailSlug: "05-nnt-tam-ngung-hoat-dong-kinh-doanh",
    reasons: [{ code: "01", name: "CQT chuyển trạng thái mã số thuế của NNT về tạm ngừng hoạt động, kinh doanh trong thời hạn đã được chấp thuận", content: "NNT được phép tạm ngừng hoạt động, kinh doanh trong thời hạn đã được cơ quan thuế hoặc cơ quan có thẩm quyền chấp thuận" }],
    whatToCheck: [
      "Trạng thái gắn với một thời hạn tạm ngừng đã được chấp thuận; hết thời hạn, trạng thái có thể thay đổi.",
      "Xem thông báo tạm ngừng trên cổng đăng ký doanh nghiệp quốc gia để biết thời hạn.",
      "Hóa đơn hoặc hợp đồng phát sinh trong thời gian tạm ngừng cần được đối chiếu với đối tác.",
    ],
  },
  {
    code: "06",
    officialName: "NNT không hoạt động tại địa chỉ đã đăng ký",
    explanation: "Cơ quan thuế đã ban hành thông báo người nộp thuế không hoạt động tại địa chỉ đã đăng ký, hoặc xác minh như vậy trong quá trình xử lý chấm dứt hiệu lực mã số thuế, phá sản hoặc thu hồi giấy phép.",
    effectiveStatus: "in-force",
    legalSource: S,
    applicability: "Áp dụng chung; lý do 17 dành cho đơn vị phụ thuộc, mã số nộp thay.",
    detailSlug: "06-nnt-khong-hoat-dong-tai-dia-chi-dang-ky",
    reasons: [
      { code: "03", name: "NNT không hoạt động tại địa chỉ đã đăng ký và có hồ sơ chấm dứt hiệu lực MST", content: "NNT bị CQT ban hành Thông báo không hoạt động tại địa chỉ đã đăng ký sau đó nộp hồ sơ chấm dứt hiệu lực MST; hoặc NNT đã nộp hồ sơ chấm dứt hiệu lực MST nhưng chưa hoàn thành nghĩa vụ thuế và CQT xác minh NNT không hoạt động tại địa chỉ đã đăng ký" },
      { code: "07", name: "NNT không hoạt động tại địa chỉ đã đăng ký và có quyết định mở thủ tục phá sản của Tòa án", content: "Tòa án ban hành Quyết định mở thủ tục phá sản đối với doanh nghiệp, hợp tác xã gửi cơ quan thuế khi NNT đang bị cơ quan thuế thông báo không hoạt động tại địa chỉ đã đăng ký" },
      { code: "09", name: "CQT ban hành Thông báo không hoạt động tại địa chỉ đã đăng ký", content: "NNT bị CQT ban hành Thông báo không hoạt động tại địa chỉ kinh doanh đã đăng ký sau khi phối hợp với cơ quan có thẩm quyền xác minh tại địa chỉ trụ sở của NNT" },
      { code: "12", name: "NNT không hoạt động tại địa chỉ đã đăng ký và có quyết định tuyên bố phá sản của Tòa án", content: "Tòa án ban hành Quyết định tuyên bố phá sản đối với doanh nghiệp, hợp tác xã gửi cơ quan thuế khi NNT đang bị cơ quan thuế thông báo không hoạt động tại địa chỉ đã đăng ký" },
      { code: "13", name: "NNT không hoạt động tại địa chỉ đã đăng ký và bị thu hồi giấy phép", content: "NNT bị CQT ban hành Thông báo không hoạt động tại địa chỉ kinh doanh đã đăng ký sau đó bị cơ quan có thẩm quyền thu hồi giấy phép; hoặc NNT đã bị cơ quan có thẩm quyền thu hồi giấy phép nhưng chưa hoàn thành nghĩa vụ thuế và CQT xác minh NNT không hoạt động tại địa chỉ đã đăng ký" },
      { code: "17", name: "Là đơn vị phụ thuộc, mã số nộp thay có đơn vị chủ quản bị CQT ban hành Thông báo không hoạt động tại địa chỉ kinh doanh đã đăng ký", content: "NNT là đơn vị phụ thuộc, mã số nộp thay có đơn vị chủ quản bị CQT ban hành Thông báo không hoạt động tại địa chỉ kinh doanh đã đăng ký" },
    ],
    whatToCheck: [
      "Trạng thái này xuất phát từ thông báo của cơ quan thuế về địa chỉ, không đồng nghĩa doanh nghiệp đã giải thể.",
      "Nếu bạn là chủ doanh nghiệp, liên hệ cơ quan thuế quản lý để cập nhật địa chỉ hoặc làm thủ tục theo hướng dẫn.",
      "Nếu bạn là đối tác, cân nhắc trước khi nhận hóa đơn hoặc thanh toán và yêu cầu văn bản xác nhận tình trạng hiện tại.",
    ],
  },
  {
    code: "07",
    officialName: "NNT chờ làm thủ tục phá sản",
    explanation: "Tòa án đã ban hành quyết định mở thủ tục phá sản đối với doanh nghiệp, hợp tác xã và gửi cơ quan thuế.",
    effectiveStatus: "in-force",
    legalSource: S,
    applicability: "Doanh nghiệp, hợp tác xã.",
    detailSlug: "07-nnt-cho-lam-thu-tuc-pha-san",
    reasons: [{ code: "01", name: "Tòa án ban hành Quyết định mở thủ tục phá sản", content: "Tòa án ban hành Quyết định mở thủ tục phá sản đối với doanh nghiệp, hợp tác xã gửi cơ quan thuế" }],
    whatToCheck: [
      "Đây là giai đoạn mở thủ tục, chưa phải quyết định tuyên bố phá sản; đối chiếu quyết định của Tòa án nếu cần kết luận pháp lý.",
      "Không tự kết luận doanh nghiệp đã phá sản hay đã hết nghĩa vụ thuế.",
    ],
  },
  {
    code: "09",
    officialName: "NNT chờ xác minh tình trạng hoạt động tại địa chỉ đã đăng ký",
    explanation: "Cơ quan thuế nhận được thông tin hoặc phân loại rủi ro cho thấy cần xác minh người nộp thuế có hoạt động tại địa chỉ đã đăng ký hay không, và đang chờ xác minh.",
    effectiveStatus: "in-force",
    legalSource: S,
    applicability: "Áp dụng chung.",
    detailSlug: "09-nnt-cho-xac-minh-hoat-dong-tai-dia-chi",
    reasons: [
      { code: "01", name: "NNT không nộp HSKT sau 2 lần đôn đốc", content: "CQT ban hành Thông báo yêu cầu nộp HSKT lần 2, NNT vẫn chưa nộp HSKT" },
      { code: "02", name: "Văn bản của CQT gửi NNT bị bưu điện trả lại", content: "CQT nhận lại văn bản đã gửi cho NNT qua đường bưu chính nhưng bưu điện trả lại do không có người nhận hoặc do địa chỉ không tồn tại" },
      { code: "03", name: "CQT nhận được thông tin của tổ chức, cá nhân cung cấp", content: "CQT nhận được thông tin do các tổ chức, cá nhân cung cấp có chứng cứ kèm theo về việc NNT không hoạt động tại địa chỉ đã đăng ký" },
      { code: "04", name: "CQT nhận được văn bản của cơ quan có thẩm quyền", content: "CQT nhận được văn bản của cơ quan quản lý nhà nước có thẩm quyền thông báo về việc NNT không hoạt động tại địa chỉ đã đăng ký" },
      { code: "05", name: "NNT được phân loại rủi ro cần phải xác minh khi đăng ký sử dụng hóa đơn điện tử hoặc thay đổi thông tin đăng ký sử dụng hóa đơn điện tử", content: "CQT tiếp nhận hồ sơ đăng ký sử dụng hóa đơn điện tử hoặc hồ sơ thay đổi thông tin đăng ký sử dụng hóa đơn điện tử mà NNT được phân loại rủi ro thuộc diện phải xác minh tình trạng hoạt động tại địa chỉ đã đăng ký" },
      { code: "06", name: "NNT được phân loại rủi ro cần phải xác minh khi đăng ký DN, HTX, HKD", content: "CQT nhận được thông tin về việc cấp Giấy chứng nhận đăng ký doanh nghiệp, hợp tác xã, tổ hợp tác, hộ kinh doanh, đơn vị phụ thuộc do Hệ thống thông tin quốc gia về đăng ký kinh doanh truyền sang Hệ thống ứng dụng đăng ký thuế mà NNT được phân loại rủi ro thuộc diện phải xác minh tình trạng hoạt động tại địa chỉ đã đăng ký" },
      { code: "07", name: "NNT được phân loại rủi ro cần phải xác minh khi đăng ký thuế", content: "CQT cấp Giấy chứng nhận đăng ký thuế lần đầu hoặc khi thay đổi thông tin đăng ký thuế mà NNT được phân loại rủi ro thuộc diện phải xác minh tình trạng hoạt động tại địa chỉ đã đăng ký" },
    ],
    whatToCheck: [
      "Đây là trạng thái chờ xác minh, chưa phải kết luận người nộp thuế không hoạt động tại địa chỉ; kết quả có thể chuyển sang trạng thái khác.",
      "Lý do rất khác nhau (không nộp hồ sơ khai thuế, thư bị trả lại, thông tin từ bên thứ ba, phân loại rủi ro): xem lý do chi tiết trước khi kết luận.",
      "Nếu bạn là chủ doanh nghiệp, kiểm tra địa chỉ đã đăng ký, nhận thông báo của cơ quan thuế và phối hợp xác minh.",
    ],
  },
  {
    code: "10",
    officialName: "Mã số thuế chờ cập nhật thông tin số định danh cá nhân",
    explanation: "Cá nhân đã được cấp mã số thuế thuộc trường hợp dùng số định danh cá nhân thay mã số thuế nhưng thông tin chưa khớp với Cơ sở dữ liệu quốc gia về dân cư.",
    effectiveStatus: "in-force",
    legalSource: S,
    applicability: "Cá nhân.",
    reasons: [{ code: "01", name: "Mã số thuế chờ cập nhật thông tin số định danh cá nhân", content: "Cá nhân đã được cấp MST thuộc trường hợp sử dụng số định danh cá nhân thay cho mã số thuế nhưng thông tin chưa khớp với CSDLQGDC" }],
  },
];

export const findTaxStatus = (code: string) => TAX_STATUSES.find((s) => s.code === code);
export const findTaxStatusBySlug = (slug: string) => TAX_STATUSES.find((s) => s.detailSlug === slug);
export const TAX_STATUS_DETAIL_PAGES = TAX_STATUSES.filter((s) => s.detailSlug && s.effectiveStatus === "in-force");
export const taxStatusPath = (slug: string) => `/trang-thai/mst/${slug}`;
