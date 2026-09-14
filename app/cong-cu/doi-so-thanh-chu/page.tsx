import { ToolPage, toolMetadata } from "../ToolPage";
import { NumberToWords } from "./NumberToWords";

const SLUG = "doi-so-thanh-chu";

export const metadata = toolMetadata(SLUG);

export default function Page() {
  return (
    <ToolPage
      slug={SLUG}
      intro={
        <>
          <p>
            Nhập số tiền, công cụ đọc ra chữ tiếng Việt theo cách ghi trên hóa đơn, phiếu thu, phiếu chi và hợp đồng.
            Ví dụ 1.234.000 đọc là “Một triệu hai trăm ba mươi tư nghìn đồng”.
          </p>
          <p>Hỗ trợ đến hàng trăm nghìn tỷ, đọc đúng “mười/mươi”, “bốn/tư”, “năm/lăm”, “một/mốt” và số 0 ở giữa (“lẻ”).</p>
        </>
      }
    >
      <NumberToWords />
    </ToolPage>
  );
}
