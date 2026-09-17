import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, OPERATOR_NAME, SITE_NAME, SITE_URL } from "@/lib/site";
import { REL_EXTERNAL_INFO } from "@/lib/relAttrs";
import siteStyles from "../components/site.module.css";

export const metadata: Metadata = {
  title: `Chính sách bảo mật | ${SITE_NAME}`,
  description: "Dữ liệu nào masothuedn.com thu thập, dùng để làm gì, lưu ở đâu và quyền của bạn đối với dữ liệu đó.",
  alternates: { canonical: `${SITE_URL}/chinh-sach-bao-mat` },
};

export default function PrivacyPolicyPage() {
  return (
    <main className={siteStyles.page}>
      <div className={siteStyles.crumb}>
        <Link href="/">Trang chủ</Link> / Chính sách bảo mật
      </div>
      <h1 className={siteStyles.title}>Chính sách bảo mật</h1>
      <p className={siteStyles.lead}>
        Trang này giải thích masothuedn.com thu thập dữ liệu gì, dùng để làm gì, và bạn có thể yêu cầu những gì.
      </p>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Dữ liệu chúng tôi hiển thị</h2>
        <p>
          Thông tin doanh nghiệp hiển thị trên trang tra cứu (tên, mã số thuế, địa chỉ, tình trạng hoạt động) được lấy
          từ nguồn dữ liệu doanh nghiệp công khai, không phải do chúng tôi tự thu thập từ doanh nghiệp.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Dữ liệu bạn gửi qua form cập nhật hồ sơ</h2>
        <p>Khi bạn gửi form tại trang cập nhật hồ sơ doanh nghiệp, chúng tôi nhận:</p>
        <ul>
          <li>Thông tin doanh nghiệp, mô tả ngắn và danh sách dịch vụ — sẽ hiển thị công khai trên trang hồ sơ.</li>
          <li>
            Thông tin liên hệ công khai (số điện thoại, Zalo, website, email) — chỉ hiển thị nếu bạn đánh dấu đồng ý
            công khai trong form.
          </li>
          <li>
            Thông tin người gửi (họ tên, chức vụ, số điện thoại) — <strong>không công khai</strong>, chỉ dùng để gọi
            xác minh trước khi hồ sơ được duyệt đăng.
          </li>
        </ul>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Dữ liệu form nhận báo giá vị trí nổi bật</h2>
        <p>
          Khi bạn để lại thông tin ở trang vị trí nổi bật, chúng tôi nhận họ tên, số điện thoại, ngành, tỉnh/thành phố
          và lời nhắn của bạn. Dữ liệu này chỉ dùng để liên hệ báo giá, không hiển thị công khai.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Dữ liệu kỹ thuật</h2>
        <p>
          Địa chỉ IP khi bạn gửi form chỉ được lưu dưới dạng mã hoá một chiều (băm cùng khoá bí mật), không lưu IP
          gốc; mục đích duy nhất là chống gửi spam hàng loạt. Các form cũng dùng Cloudflare Turnstile để kiểm tra
          người gửi là người thật, không phải máy tự động — xem{" "}
          <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel={REL_EXTERNAL_INFO}>
            chính sách bảo mật của Cloudflare
          </a>
          . Masothuedn.com hiện không dùng công cụ phân tích lượt truy cập hay cookie theo dõi cho mục đích quảng cáo.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Mục đích sử dụng</h2>
        <p>
          Dữ liệu bạn gửi chỉ được dùng để hiển thị hồ sơ (nếu bạn đồng ý), xác minh thông tin và liên hệ báo giá theo
          đúng mục đích bạn đã gửi. Chúng tôi không bán hoặc chia sẻ dữ liệu của bạn cho bên thứ ba để quảng cáo.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Nơi lưu trữ và bên xử lý</h2>
        <p>
          Dữ liệu được lưu trên hạ tầng máy chủ và cơ sở dữ liệu của nhà cung cấp dịch vụ lưu trữ mà masothuedn.com sử
          dụng. Cloudflare được dùng để hỗ trợ chống spam (Turnstile) khi bạn gửi form.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Thời gian lưu trữ</h2>
        <p>
          Hồ sơ doanh nghiệp đã duyệt được lưu trong thời gian còn hiển thị trên trang. Các dữ liệu khác (thông tin
          người gửi, dữ liệu form báo giá) được lưu trong thời gian cần thiết cho mục đích nêu trên, hoặc đến khi bạn
          yêu cầu xoá.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Quyền của bạn</h2>
        <p>
          Bạn có quyền xem, sửa, xoá dữ liệu của mình, rút lại đồng ý công khai thông tin liên hệ, hoặc phản đối việc
          hồ sơ của bạn được hiển thị. Để thực hiện, gửi yêu cầu qua trang{" "}
          <Link href="/yeu-cau-go-thong-tin">Yêu cầu gỡ thông tin</Link>
          {CONTACT_EMAIL ? (
            <>
              {" "}
              hoặc email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </>
          ) : null}
          . {OPERATOR_NAME} sẽ xem xét và phản hồi từng yêu cầu.
        </p>
      </section>

      <section className={siteStyles.section}>
        <h2 className={siteStyles.sectionTitle}>Căn cứ pháp lý</h2>
        <p>Chính sách này được xây dựng theo Luật Bảo vệ dữ liệu cá nhân, có hiệu lực từ ngày 01/01/2026.</p>
      </section>

      <p className={siteStyles.lead} style={{ marginTop: 40 }}>
        Ngày cập nhật: 17/09/2026.
      </p>
    </main>
  );
}
