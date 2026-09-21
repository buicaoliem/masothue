import Link from "next/link";
import { buildStaticMetadata } from "@/lib/seo/metadata";
import { InfoPage, InfoSection } from "../components/InfoPage";

export const metadata = buildStaticMetadata({
  title: "Chính sách biên tập",
  description: "Nguyên tắc biên tập nội dung hướng dẫn, cách xử lý sai sót và cách phân biệt nội dung tự động với nội dung do người viết.",
  path: "/chinh-sach-bien-tap",
});

export default function EditorialPolicyPage() {
  return (
    <InfoPage
      path="/chinh-sach-bien-tap"
      title="Chính sách biên tập"
      lead="Nguyên tắc chúng tôi áp dụng cho bài hướng dẫn, công cụ và các trang tổng hợp dữ liệu."
    >
      <InfoSection title="Hai loại nội dung">
        <p>
          <strong>Hồ sơ và trang danh sách doanh nghiệp</strong> được tạo tự động từ dữ liệu công khai; chúng không phải bài
          viết biên tập và không có ý kiến, đánh giá hay xếp hạng chất lượng doanh nghiệp.
        </p>
        <p>
          <strong>Bài <Link href="/huong-dan">hướng dẫn</Link></strong> do ban biên tập viết và rà soát. Ngày hiển thị trên
          bài là ngày biên tập thực tế; ngày sửa đổi chỉ đổi khi nội dung thay đổi.
        </p>
      </InfoSection>
      <InfoSection title="Nguyên tắc">
        <ul>
          <li>Không dựng đánh giá, nhận xét hay lượt xác nhận giả; không gắn nhãn “đã xác minh” cho dữ liệu chưa xác minh.</li>
          <li>Không đăng số liệu, quy định thuế mà chưa đối chiếu nguồn.</li>
          <li>Nội dung có liên kết quảng cáo hoặc dịch vụ trả phí được đánh dấu rõ và dùng thuộc tính rel phù hợp.</li>
        </ul>
      </InfoSection>
      <InfoSection title="Báo lỗi">
        <p>
          Nếu phát hiện sai sót, hãy dùng trang <Link href="/lien-he">liên hệ</Link>. Lỗi được sửa và ngày sửa đổi được cập nhật
          tương ứng.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
