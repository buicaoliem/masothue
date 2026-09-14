import Link from "next/link";
import { ToolPage, toolMetadata } from "../ToolPage";
import { PitCalculator } from "./PitCalculator";
import styles from "../tools.module.css";

const SLUG = "tinh-thue-tncn";

export const metadata = toolMetadata(SLUG);

const FAQ: { q: string; a: string }[] = [
  {
    q: "Giảm trừ gia cảnh 2026 là bao nhiêu?",
    a: "Giảm trừ cho bản thân người nộp thuế là 15.500.000 đ/tháng. Giảm trừ cho mỗi người phụ thuộc là 6.200.000 đ/tháng.",
  },
  {
    q: "Biểu thuế thu nhập cá nhân có mấy bậc?",
    a: "Biểu thuế lũy tiến từng phần áp dụng cho thu nhập từ tiền lương, tiền công gồm 5 bậc, thuế suất từ 5% đến 35% theo mức thu nhập tính thuế tăng dần.",
  },
  {
    q: "Thu nhập bao nhiêu thì phải nộp thuế TNCN?",
    a: "Người không có người phụ thuộc bắt đầu phải nộp thuế khi thu nhập chịu thuế/tháng vượt quá mức giảm trừ bản thân (15.500.000 đ). Có thêm người phụ thuộc thì ngưỡng này tăng thêm 6.200.000 đ cho mỗi người.",
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
          Tính thuế thu nhập cá nhân (TNCN) phải nộp mỗi tháng từ tiền lương, tiền công theo biểu thuế lũy tiến từng
          phần và mức giảm trừ gia cảnh hiện hành. Xem thêm công cụ{" "}
          <Link href="/cong-cu/tinh-luong">tính lương Gross - Net</Link> nếu cần quy đổi từ lương Gross.
        </p>
      }
    >
      <PitCalculator />

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
