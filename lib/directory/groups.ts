// Directory groups (ngành). Order is the display order; slugs are part of public URLs, never rename.

export type DirectoryGroup = { slug: string; label: string };

export const DIRECTORY_GROUPS: readonly DirectoryGroup[] = [
  { slug: "ke-toan-thue", label: "Kế toán, thuế" },
  { slug: "luat-phap-ly", label: "Luật, pháp lý doanh nghiệp" },
  { slug: "tu-van-quan-ly", label: "Tư vấn quản lý" },
  { slug: "quang-cao-marketing", label: "Quảng cáo, marketing" },
  { slug: "in-an-bao-bi", label: "In ấn, bao bì" },
  { slug: "thiet-ke-xay-dung", label: "Thiết kế, xây dựng" },
  { slug: "noi-that", label: "Nội thất" },
  { slug: "vat-lieu-xay-dung", label: "Vật liệu xây dựng" },
  { slug: "dien-nuoc-dieu-hoa", label: "Điện, nước, điều hòa" },
  { slug: "co-khi-gia-cong", label: "Cơ khí, gia công" },
  { slug: "van-tai-logistics", label: "Vận tải, logistics" },
  { slug: "chuyen-phat", label: "Chuyển phát" },
  { slug: "kho-bai", label: "Kho bãi" },
  { slug: "xuat-nhap-khau", label: "Xuất nhập khẩu" },
  { slug: "phan-mem-cntt", label: "Phần mềm, công nghệ thông tin" },
  { slug: "thiet-bi-van-phong", label: "Thiết bị văn phòng, máy tính" },
  { slug: "vien-thong-internet", label: "Viễn thông, internet" },
  { slug: "nha-hang-an-uong", label: "Nhà hàng, ăn uống" },
  { slug: "khach-san-luu-tru", label: "Khách sạn, lưu trú" },
  { slug: "du-lich-lu-hanh", label: "Du lịch, lữ hành" },
  { slug: "to-chuc-su-kien", label: "Tổ chức sự kiện" },
  { slug: "spa-tham-my", label: "Spa, thẩm mỹ" },
  { slug: "salon-toc-nail", label: "Salon tóc, nail" },
  { slug: "phong-kham-nha-khoa", label: "Phòng khám, nha khoa" },
  { slug: "duoc-thiet-bi-y-te", label: "Dược phẩm, thiết bị y tế" },
  { slug: "giao-duc-dao-tao", label: "Giáo dục, đào tạo" },
  { slug: "gym-the-thao", label: "Phòng gym, thể thao" },
  { slug: "bat-dong-san", label: "Bất động sản" },
  { slug: "bao-hiem", label: "Bảo hiểm" },
  { slug: "bao-ve-an-ninh", label: "Bảo vệ, an ninh" },
  { slug: "ve-sinh-cong-nghiep", label: "Vệ sinh công nghiệp" },
  { slug: "nhan-su-tuyen-dung", label: "Nhân sự, tuyển dụng" },
  { slug: "det-may-thoi-trang", label: "Dệt may, thời trang" },
  { slug: "san-xuat-thuc-pham", label: "Sản xuất thực phẩm, đồ uống" },
  { slug: "nong-nghiep-thuy-san", label: "Nông nghiệp, thủy sản" },
  { slug: "hoa-chat-nhua", label: "Hóa chất, nhựa" },
  { slug: "o-to-xe-may", label: "Ô tô, xe máy" },
  { slug: "dien-tu-dien-lanh", label: "Điện tử, điện lạnh" },
  { slug: "thuong-mai-tong-hop", label: "Thương mại tổng hợp" },
  { slug: "tai-chinh-doanh-nghiep", label: "Tư vấn tài chính doanh nghiệp" },
  { slug: "khac", label: "Khác" },
];

const BY_SLUG = new Map(DIRECTORY_GROUPS.map((g) => [g.slug, g]));

export function findDirectoryGroup(slug: string): DirectoryGroup | null {
  return BY_SLUG.get(slug) ?? null;
}
