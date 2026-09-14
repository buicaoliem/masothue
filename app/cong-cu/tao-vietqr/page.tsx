import { ToolPage, toolMetadata } from "../ToolPage";
import { VietQrGenerator } from "./VietQrGenerator";

const SLUG = "tao-vietqr";

export const metadata = toolMetadata(SLUG);

export default function Page() {
  return (
    <ToolPage
      slug={SLUG}
      intro={
        <>
          <p>
            Tạo mã QR chuyển khoản theo chuẩn VietQR của NAPAS: người trả tiền mở ứng dụng ngân hàng, quét mã là có sẵn
            số tài khoản, ngân hàng, số tiền và nội dung chuyển khoản.
          </p>
          <p>
            Mã được tạo ngay trên trình duyệt của bạn, không gửi thông tin đi đâu. Nên quét thử bằng ứng dụng ngân hàng
            trước khi in hoặc gửi cho khách.
          </p>
        </>
      }
    >
      <VietQrGenerator />
    </ToolPage>
  );
}
