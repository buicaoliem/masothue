import Link from "next/link";
import { CONTACT_EMAIL, OPERATOR_NAME } from "@/lib/site";
import { buildStaticMetadata } from "@/lib/seo/metadata";
import { InfoPage, InfoSection } from "../components/InfoPage";

export const metadata = buildStaticMetadata({
  title: "Liên hệ",
  description: "Cách liên hệ masothuedn.com: báo sai sót dữ liệu, yêu cầu gỡ thông tin doanh nghiệp, cập nhật hồ sơ hoặc hợp tác.",
  path: "/lien-he",
});

export default function ContactPage() {
  return (
    <InfoPage path="/lien-he" title="Liên hệ" lead={`${OPERATOR_NAME} tiếp nhận góp ý và yêu cầu qua các kênh dưới đây.`}>
      <InfoSection title="Theo mục đích">
        <ul>
          <li>
            Dữ liệu sai hoặc muốn gỡ hồ sơ: <Link href="/yeu-cau-go-thong-tin">gửi yêu cầu gỡ thông tin</Link>.
          </li>
          <li>
            Chủ doanh nghiệp muốn bổ sung mô tả, dịch vụ: <Link href="/cap-nhat-ho-so">cập nhật hồ sơ</Link>.
          </li>
          {CONTACT_EMAIL && (
            <li>
              Góp ý, báo lỗi nội dung, hợp tác: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </li>
          )}
        </ul>
      </InfoSection>
      <InfoSection title="Trước khi liên hệ">
        <p>
          Xem <Link href="/nguon-du-lieu">nguồn dữ liệu</Link> và <Link href="/phuong-phap-du-lieu">phương pháp dữ liệu</Link>{" "}
          để biết dữ liệu được lấy và cập nhật thế nào.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
