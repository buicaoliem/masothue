import Link from "next/link";
import { OPENDATA_PUBLISHERS } from "@/lib/opendata-sources";
import { buildStaticMetadata } from "@/lib/seo/metadata";
import { InfoPage, InfoSection } from "../components/InfoPage";

export const metadata = buildStaticMetadata({
  title: "Nguồn dữ liệu",
  description: "Dữ liệu doanh nghiệp trên masothuedn.com đến từ đâu, phần nào là dữ liệu công khai và phần nào do doanh nghiệp tự gửi.",
  path: "/nguon-du-lieu",
});

export default function DataSourcesPage() {
  return (
    <InfoPage
      path="/nguon-du-lieu"
      title="Nguồn dữ liệu"
      lead="Ba loại dữ liệu khác nhau xuất hiện trên trang. Mỗi loại có mức độ tin cậy khác nhau, và chúng tôi tách bạch chúng."
    >
      <InfoSection title="1. Dữ liệu đăng ký doanh nghiệp công khai">
        <p>
          Tên, mã số thuế, địa chỉ, người đại diện, ngành nghề và tình trạng hoạt động trong hồ sơ doanh nghiệp được lấy từ
          nguồn dữ liệu đăng ký công khai, không phải do chúng tôi thu thập trực tiếp từ doanh nghiệp. Đây là dữ liệu công
          khai, <strong>chưa được masothuedn.com xác minh riêng</strong> với từng doanh nghiệp.
        </p>
        <p>
          Một số hồ sơ được bổ sung từ tập dữ liệu mở do cơ quan nhà nước công bố:
        </p>
        <ul>
          {Object.values(OPENDATA_PUBLISHERS).map((p) => (
            <li key={p}>Dữ liệu mở của {p}</li>
          ))}
        </ul>
        <p>Hồ sơ nào lấy từ tập dữ liệu mở đều ghi rõ nguồn và ngày dữ liệu ngay trên trang hồ sơ.</p>
      </InfoSection>
      <InfoSection title="2. Hồ sơ do doanh nghiệp tự gửi (danh bạ)">
        <p>
          Mô tả, dịch vụ và thông tin liên hệ trong <Link href="/danh-ba">danh bạ</Link> do đại diện doanh nghiệp gửi qua form
          cập nhật hồ sơ. Chúng tôi gọi điện xác nhận với người gửi trước khi đăng. Đây là xác nhận quyền gửi hồ sơ, không phải
          chứng nhận độ chính xác của mọi thông tin doanh nghiệp.
        </p>
      </InfoSection>
      <InfoSection title="3. Dữ liệu tính toán từ công cụ">
        <p>Các công cụ tính thuế, lương chạy trên số liệu và quy định nêu ngay trong từng công cụ; kết quả mang tính tham khảo.</p>
      </InfoSection>
      <InfoSection title="Lưu ý">
        <p>
          Nguồn công khai có thể chậm hơn thay đổi thực tế. Khi cần dữ liệu có giá trị pháp lý, hãy đối chiếu với cơ quan thuế
          hoặc cổng đăng ký doanh nghiệp. Xem thêm <Link href="/phuong-phap-du-lieu">phương pháp dữ liệu</Link> và{" "}
          <Link href="/yeu-cau-go-thong-tin">yêu cầu chỉnh sửa, gỡ thông tin</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
