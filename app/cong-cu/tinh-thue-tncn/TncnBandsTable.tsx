"use client";

import { TAX_BRACKETS } from "@/lib/tools/payroll-config";
import { computeTaxBrackets } from "@/lib/tools/pit";
import { formatVnd } from "@/lib/tools/payroll";
import siteStyles from "../../components/site.module.css";
import styles from "../tools.module.css";

function bandLabel(index: number): string {
  const prevUpTo = index === 0 ? 0 : TAX_BRACKETS[index - 1].upTo;
  const upTo = TAX_BRACKETS[index].upTo;
  if (prevUpTo === 0) return `Đến ${formatVnd(upTo)} đ`;
  if (upTo === Infinity) return `Trên ${formatVnd(prevUpTo)} đ`;
  return `Trên ${formatVnd(prevUpTo)} đến ${formatVnd(upTo)} đ`;
}

/** The full 5-band TNCN table, with the band the given taxable income reaches highlighted. */
export function TncnBandsTable({ taxableIncome }: { taxableIncome: number }) {
  const { rows } = computeTaxBrackets(taxableIncome);
  const currentIndex = rows.length - 1;

  return (
    <div className={styles.bands}>
      <h2 className={siteStyles.sectionTitle}>Biểu thuế 5 bậc năm 2026</h2>
      <p className={styles.note}>Dòng tô màu là bậc cao nhất mà thu nhập của bạn chạm tới.</p>
      <table className={styles.tbl}>
        <thead>
          <tr>
            <th>Bậc</th>
            <th>Thu nhập tính thuế/tháng</th>
            <th className={styles.r}>Thuế suất</th>
            <th className={styles.r}>Thuế ở bậc này</th>
          </tr>
        </thead>
        <tbody>
          {TAX_BRACKETS.map((b, i) => (
            <tr key={b.upTo} className={i === currentIndex ? styles.cur : ""}>
              <td data-l="Bậc">Bậc {i + 1}</td>
              <td data-l="Thu nhập tính thuế">{bandLabel(i)}</td>
              <td className={styles.r} data-l="Thuế suất">
                {Math.round(b.rate * 100)}%
              </td>
              <td className={styles.r} data-l="Thuế ở bậc này">
                {taxableIncome > 0 && rows[i] ? `${formatVnd(rows[i].tax)} đ` : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
