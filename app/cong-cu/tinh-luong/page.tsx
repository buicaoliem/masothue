import { ToolPage, toolMetadata } from "../ToolPage";
import { PayrollCalculator } from "./PayrollCalculator";
import styles from "../tools.module.css";

const SLUG = "tinh-luong";

export const metadata = toolMetadata(SLUG);

export default function Page() {
  return (
    <ToolPage
      slug={SLUG}
      intro={
        <>
          <p>
            Tính lương Gross sang Net hoặc Net sang Gross theo mức giảm trừ gia cảnh, tỷ lệ bảo hiểm bắt buộc và biểu
            thuế thu nhập cá nhân (TNCN) lũy tiến từng phần. Xem diễn giải từng bước: bảo hiểm, giảm trừ, thu nhập
            tính thuế, thuế TNCN theo bậc.
          </p>
        </>
      }
    >
      <PayrollCalculator />
      <p className={styles.hint} style={{ marginTop: 16 }}>
        Số liệu theo Luật Thuế TNCN 2026 (biểu 5 bậc) và mức đóng bảo hiểm hiện hành; mang tính tham khảo, vui lòng
        đối chiếu khi quyết toán.
      </p>
    </ToolPage>
  );
}
