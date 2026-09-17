import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, OPERATOR_NAME, SITE_NAME, SITE_URL } from "@/lib/site";
import siteStyles from "../components/site.module.css";

export const metadata: Metadata = {
  title: `Điều khoản sử dụng | ${SITE_NAME}`,
  description: "Điều khoản sử dụng masothuedn.com: phạm vi thông tin, trách nhiệm và quyền của người dùng.",
  alternates: { canonical: `${SITE_URL}/dieu-khoan` },
};

export default function TermsPage() {
  return (
    <main className={siteStyles.page}>
      <div className={siteStyles.crumb}>
        <Link href="/">Trang chủ</Link> / Điều khoản sử dụng
      </div>
      <h1 className={siteStyles.title}>Điều khoản sử dụng</h1>
      <p className={siteStyles.lead}>Vui lòng đọc trước khi sử dụng masothuedn.com.</p>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Thông tin mang tính tham khảo</h2>
        <p>
          Nội dung trên masothuedn.com chỉ mang tính tham khảo, không phải tư vấn pháp lý hay tư vấn thuế. Với các
          quyết định quan trọng, bạn nên đối chiếu với cơ quan thuế hoặc chuyên viên tư vấn.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Kết quả từ công cụ tính toán</h2>
        <p>
          Kết quả từ các công cụ (tính thuế, tính lương, đổi số thành chữ...) là số liệu ước tính dựa trên quy định
          hiện hành. Bạn cần đối chiếu lại khi quyết toán hoặc thực hiện nghĩa vụ chính thức.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Thông tin doanh nghiệp</h2>
        <p>
          Thông tin doanh nghiệp trên trang tra cứu được lấy từ nguồn dữ liệu công khai và có thể chưa được cập nhật
          kịp thời so với thực tế.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Hồ sơ do doanh nghiệp tự gửi</h2>
        <p>
          Hồ sơ tại trang danh bạ do đại diện doanh nghiệp tự gửi qua form cập nhật. Chúng tôi gọi điện xác minh
          trước khi đăng, nhưng người gửi chịu trách nhiệm về tính đúng đắn của thông tin đã cung cấp.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Vị trí &quot;Đứng đầu ngành&quot;</h2>
        <p>
          Vị trí &quot;Đứng đầu ngành&quot; trong danh bạ là vị trí tài trợ, luôn được ghi nhãn rõ ràng và không ảnh
          hưởng đến tính khách quan của thông tin doanh nghiệp khác.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Quyền từ chối, gỡ hồ sơ</h2>
        <p>
          Chúng tôi có quyền từ chối đăng hoặc gỡ bỏ bất kỳ hồ sơ nào sai sự thật, gây nhầm lẫn hoặc vi phạm điều
          khoản này, không cần báo trước.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Không thu thập dữ liệu hàng loạt</h2>
        <p>
          Bạn không được thu thập dữ liệu hàng loạt (crawl, scrape) từ masothuedn.com dưới mọi hình thức khi chưa
          được cho phép.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Liên hệ</h2>
        <p>
          Mọi thắc mắc về điều khoản sử dụng, gửi qua trang{" "}
          <Link href="/yeu-cau-go-thong-tin">Yêu cầu gỡ thông tin</Link>
          {CONTACT_EMAIL ? (
            <>
              {" "}
              hoặc email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </>
          ) : null}
          . {OPERATOR_NAME}.
        </p>
      </section>

      <p className={siteStyles.lead} style={{ marginTop: 40 }}>
        Ngày cập nhật: 17/09/2026.
      </p>
    </main>
  );
}
