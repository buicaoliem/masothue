import Link from "next/link";
import { ToolPage, toolMetadata } from "../ToolPage";
import { MstChecker } from "./MstChecker";
import styles from "../tools.module.css";

const SLUG = "kiem-tra-ma-so-thue";

export const metadata = toolMetadata(SLUG);

const FAQ: { q: string; a: string }[] = [
  {
    q: "Mã số thuế hợp lệ là gì?",
    a: "Mã số thuế hợp lệ gồm 10 chữ số (doanh nghiệp) hoặc 13 chữ số (đơn vị trực thuộc, gồm 10 số gốc và 3 số chi nhánh). Chữ số cuối cùng của 10 số gốc là chữ số kiểm tra, tính theo công thức quy định tại Thông tư 105/2020/TT-BTC. Nếu chữ số kiểm tra không khớp, mã số thuế đó không tồn tại.",
  },
  {
    q: "Cách kiểm tra mã số thuế có hợp lệ không?",
    a: "Nhập mã số thuế vào ô phía trên và bấm “Kiểm tra”. Công cụ kiểm tra định dạng và chữ số kiểm tra theo đúng quy định; nếu mã số thuế đã có trong danh bạ, công cụ hiện thêm tên và trạng thái doanh nghiệp.",
  },
  {
    q: "Mã số thuế 10 số và 13 số khác nhau thế nào?",
    a: "Mã số thuế 10 số cấp cho doanh nghiệp độc lập. Mã số thuế 13 số (ví dụ 0101248141-001) cấp cho đơn vị trực thuộc, chi nhánh của doanh nghiệp mang mã số thuế 10 số gốc đó.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function Page() {
  return (
    <ToolPage
      slug={SLUG}
      intro={
        <p>
          Kiểm tra mã số thuế (MST) 10 số hoặc 13 số có hợp lệ không, theo đúng chuẩn chữ số kiểm tra tại Thông tư
          105/2020/TT-BTC. Mã số thuế hợp lệ và đã có trong <Link href="/">danh bạ doanh nghiệp</Link> sẽ hiện thêm
          tên và trạng thái.
        </p>
      }
    >
      <MstChecker />

      <section className={styles.faqSection}>
        <h2 className={styles.faqTitle}>Câu hỏi thường gặp</h2>
        {FAQ.map(({ q, a }) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
    </ToolPage>
  );
}
