import { ToolPage, toolMetadata } from "../ToolPage";
import { OvertimeCalculator } from "./OvertimeCalculator";
import styles from "../tools.module.css";

const SLUG = "tinh-luong-lam-them-gio";

export const metadata = toolMetadata(SLUG);

const FAQ: { q: string; a: string }[] = [
  {
    q: "Mức lương làm thêm giờ tối thiểu là bao nhiêu?",
    a: "Theo Điều 98 Bộ luật Lao động 2019, làm thêm giờ vào ngày thường được trả ít nhất 150% đơn giá tiền lương giờ, vào ngày nghỉ hằng tuần ít nhất 200%, vào ngày lễ, tết ít nhất 300% (chưa kể lương ngày lễ với người hưởng lương ngày).",
  },
  {
    q: "Làm thêm giờ vào ban đêm tính thế nào?",
    a: "Người lao động làm việc vào ban đêm được trả thêm ít nhất 30% tiền lương giờ thực trả của ngày làm việc bình thường; nếu vừa làm thêm giờ vừa làm vào ban đêm thì được trả thêm 20% tiền lương tính theo đơn giá của ngày, giờ làm việc tương ứng (Điều 98 Bộ luật Lao động, Điều 57 Nghị định 145/2020/NĐ-CP).",
  },
  {
    q: "Lương giờ tính từ lương tháng như thế nào?",
    a: "Lương giờ = lương tháng ÷ số ngày làm việc tiêu chuẩn trong tháng ÷ số giờ làm việc tiêu chuẩn trong ngày, theo Điều 55 Nghị định 145/2020/NĐ-CP. Doanh nghiệp có thể quy định số ngày công, số giờ công khác nhau.",
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
        <>
          <p>
            Tính tiền lương làm thêm giờ theo mức tối thiểu quy định tại Bộ luật Lao động 2019 và Nghị định
            145/2020/NĐ-CP: 150%/200%/300% theo ngày thường, ngày nghỉ hằng tuần, ngày lễ tết, cộng thêm phụ trội ban
            đêm.
          </p>
          <p>Nhập lương theo tháng hoặc lương giờ trực tiếp, rồi điền số giờ làm thêm theo từng loại ngày, giờ.</p>
        </>
      }
    >
      <OvertimeCalculator />

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
