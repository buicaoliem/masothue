import { ToolPage, toolMetadata } from "../ToolPage";
import { VatCalculator } from "./VatCalculator";

const SLUG = "tinh-vat";

export const metadata = toolMetadata(SLUG);

export default function Page() {
  return (
    <ToolPage
      slug={SLUG}
      intro={
        <>
          <p>
            Tính thuế giá trị gia tăng (GTGT, VAT) theo thuế suất 0%, 5%, 8% hoặc 10%. Chọn “Giá chưa có VAT” khi có
            giá chưa thuế, hoặc “Giá đã gồm VAT” khi có giá đã gồm thuế và cần biết tiền hàng, tiền thuế.
          </p>
          <p>Kết quả làm tròn đến đồng. Thuế suất áp dụng cho từng mặt hàng theo quy định hiện hành.</p>
        </>
      }
    >
      <VatCalculator />
    </ToolPage>
  );
}
