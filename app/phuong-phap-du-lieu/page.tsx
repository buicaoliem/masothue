import Link from "next/link";
import { buildStaticMetadata } from "@/lib/seo/metadata";
import { InfoPage, InfoSection } from "../components/InfoPage";

export const metadata = buildStaticMetadata({
  title: "Phương pháp dữ liệu",
  description: "Cách masothuedn.com thu thập, chuẩn hóa, cập nhật dữ liệu doanh nghiệp và quyết định trang nào được đưa lên công cụ tìm kiếm.",
  path: "/phuong-phap-du-lieu",
});

export default function MethodologyPage() {
  return (
    <InfoPage
      path="/phuong-phap-du-lieu"
      title="Phương pháp dữ liệu"
      lead="Trang này mô tả cách dữ liệu đi từ nguồn công khai đến trang hồ sơ, và giới hạn của quy trình đó."
    >
      <InfoSection title="Thu thập và chuẩn hóa">
        <p>
          Mã số thuế là khóa nhận diện duy nhất của mỗi hồ sơ. Từ nguồn công khai, chúng tôi lấy các trường có sẵn và bỏ qua
          những trường nguồn không cung cấp: trường nào không có dữ liệu sẽ hiện là “Chưa có dữ liệu” thay vì được suy đoán.
          Số điện thoại và định danh cá nhân của người đại diện không được lưu hay hiển thị.
        </p>
        <p>
          Địa chỉ được gán vào tỉnh, thành phố theo danh mục 34 đơn vị hành chính sau sáp nhập năm 2025. Một số hồ sơ từ dữ
          liệu mở vẫn ghi địa chỉ theo địa giới trước ngày 01/07/2025.
        </p>
      </InfoSection>
      <InfoSection title="Cập nhật">
        <p>
          Dữ liệu được đồng bộ theo đợt, không theo thời gian thực. Mỗi hồ sơ chỉ hiển thị mốc thời gian mà hệ thống thực sự
          có: ngày dữ liệu của nguồn công bố, hoặc thời điểm hệ thống đồng bộ gần nhất. Chúng tôi không dùng ngày dựng trang
          để thay cho ngày cập nhật dữ liệu.
        </p>
      </InfoSection>
      <InfoSection title="Trang nào được đưa lên công cụ tìm kiếm">
        <p>
          Chỉ hồ sơ có tối thiểu tên và địa chỉ, không bị ẩn theo yêu cầu, mới được liệt kê trong sơ đồ trang. Các trang danh
          sách theo tỉnh, ngành, loại hình, tình trạng chỉ được lập chỉ mục khi có đủ số doanh nghiệp thực tế; trang quá ít
          dữ liệu được đặt “noindex” để không tạo nội dung mỏng. Kết quả tìm kiếm nội bộ không bao giờ được lập chỉ mục.
        </p>
      </InfoSection>
      <InfoSection title="Sai sót và yêu cầu gỡ">
        <p>
          Nếu thấy dữ liệu sai hoặc muốn gỡ hồ sơ, hãy gửi <Link href="/yeu-cau-go-thong-tin">yêu cầu gỡ thông tin</Link>. Yêu
          cầu được xem xét thủ công; hồ sơ chỉ bị ẩn sau khi yêu cầu được chấp thuận. Xem thêm{" "}
          <Link href="/nguon-du-lieu">nguồn dữ liệu</Link> và <Link href="/chinh-sach-bien-tap">chính sách biên tập</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
