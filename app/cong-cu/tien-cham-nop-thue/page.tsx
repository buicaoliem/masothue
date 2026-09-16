import { ToolPage, toolMetadata } from "../ToolPage";
import { LatePaymentCalculator } from "./LatePaymentCalculator";
import styles from "../tools.module.css";

const SLUG = "tien-cham-nop-thue";

export const metadata = toolMetadata(SLUG);

const FAQ: { q: string; a: string }[] = [
  {
    q: "Công thức tính tiền chậm nộp thuế là gì?",
    a: "Tiền chậm nộp = số tiền thuế chậm nộp × 0,03%/ngày × số ngày chậm nộp, làm tròn đến đồng, theo khoản 2 Điều 59 Luật Quản lý thuế 38/2019/QH14.",
  },
  {
    q: "Số ngày chậm nộp tính từ ngày nào đến ngày nào?",
    a: "Tính liên tục kể từ ngày tiếp theo ngày cuối cùng của thời hạn nộp thuế đến ngày liền kề trước ngày thực nộp thuế vào ngân sách nhà nước, tính đủ theo ngày dương lịch, kể cả ngày lễ, ngày nghỉ.",
  },
  {
    q: "Khi nào được miễn tiền chậm nộp?",
    a: "Người nộp thuế được miễn tiền chậm nộp trong một số trường hợp bất khả kháng theo quy định của Luật Quản lý thuế và văn bản hướng dẫn. Cần đối chiếu hồ sơ cụ thể với cơ quan thuế quản lý trực tiếp để xác định điều kiện miễn.",
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
            Tính tiền chậm nộp thuế theo mức 0,03%/ngày trên số tiền thuế chậm nộp, tính liên tục từ ngày sau hạn nộp
            đến ngày liền trước ngày nộp thực tế.
          </p>
          <p>Dùng các nút điền nhanh để lấy hạn nộp theo kỳ khai tháng, quý hoặc quyết toán năm.</p>
        </>
      }
    >
      <LatePaymentCalculator />

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
