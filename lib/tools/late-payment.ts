// Tiền chậm nộp thuế theo khoản 2 Điều 59 Luật Quản lý thuế 38/2019/QH14:
// mức 0,03%/ngày trên số tiền thuế chậm nộp, tính liên tục kể từ ngày tiếp theo
// ngày cuối cùng của thời hạn nộp thuế đến ngày liền kề trước ngày nộp thuế.

export const LATE_PAYMENT_RATE = 0.0003; // 0,03%/ngày

export type IsoDate = string; // "YYYY-MM-DD"

function parseIsoDate(iso: IsoDate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Số ngày dương lịch giữa hai ngày (b - a), theo mốc UTC nửa đêm. */
function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((parseIsoDate(b) - parseIsoDate(a)) / MS_PER_DAY);
}

function addDays(iso: IsoDate, days: number): IsoDate {
  const t = parseIsoDate(iso) + days * MS_PER_DAY;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export type LatePaymentResult = {
  days: number;
  lateAmount: number;
  totalDue: number;
  /** Ngày bắt đầu tính chậm nộp (hạn nộp + 1 ngày), null nếu days = 0. */
  fromDate: IsoDate | null;
  /** Ngày kết thúc tính chậm nộp (ngày nộp thực tế − 1 ngày), null nếu days = 0. */
  toDate: IsoDate | null;
};

export function computeLatePayment(taxAmount: number, deadline: IsoDate, paidDate: IsoDate): LatePaymentResult {
  const days = Math.max(0, diffDays(deadline, paidDate) - 1);
  const lateAmount = Math.round(taxAmount * LATE_PAYMENT_RATE * days);
  return {
    days,
    lateAmount,
    totalDue: taxAmount + lateAmount,
    fromDate: days > 0 ? addDays(deadline, 1) : null,
    toDate: days > 0 ? addDays(paidDate, -1) : null,
  };
}

/** Hạn nộp cho kỳ khai thuế theo tháng: ngày 20 tháng sau. `month` 1-12. */
export function monthlyDeadline(year: number, month: number): IsoDate {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-20`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Hạn nộp cho kỳ khai thuế theo quý: ngày cuối cùng của tháng đầu quý sau. `quarter` 1-4. */
export function quarterlyDeadline(year: number, quarter: number): IsoDate {
  const nextQuarter = quarter === 4 ? 1 : quarter + 1;
  const nextYear = quarter === 4 ? year + 1 : year;
  const firstMonthOfNextQuarter = (nextQuarter - 1) * 3 + 1;
  const day = lastDayOfMonth(nextYear, firstMonthOfNextQuarter);
  return `${nextYear}-${String(firstMonthOfNextQuarter).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Hạn nộp quyết toán năm: ngày cuối cùng của tháng thứ 3 sau năm quyết toán. */
export function annualDeadline(year: number): IsoDate {
  const settleYear = year + 1;
  const day = lastDayOfMonth(settleYear, 3);
  return `${settleYear}-03-${String(day).padStart(2, "0")}`;
}

export const formatVnd = (n: number) => n.toLocaleString("vi-VN");

/** "2026-05-20" -> "20/05/2026" */
export function formatIsoDate(iso: IsoDate): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function todayIso(): IsoDate {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
