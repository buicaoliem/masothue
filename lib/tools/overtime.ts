// Tiền lương làm thêm giờ theo thời gian (Điều 98 Bộ luật Lao động 2019;
// Điều 55, 57 Nghị định 145/2020/NĐ-CP). Mức tối thiểu, doanh nghiệp có thể trả cao hơn.

export const STANDARD_WORKING_DAYS = 26;
export const STANDARD_HOURS_PER_DAY = 8;

export type OvertimeRowKey =
  | "weekdayDay"
  | "weekdayNight"
  | "weeklyRestDay"
  | "weeklyRestNight"
  | "holidayDay"
  | "holidayNight";

export const OVERTIME_ROWS: { key: OvertimeRowKey; label: string }[] = [
  { key: "weekdayDay", label: "Ngày thường, ban ngày" },
  { key: "weekdayNight", label: "Ngày thường, ban đêm" },
  { key: "weeklyRestDay", label: "Nghỉ hằng tuần, ban ngày" },
  { key: "weeklyRestNight", label: "Nghỉ hằng tuần, ban đêm" },
  { key: "holidayDay", label: "Lễ, tết, ban ngày" },
  { key: "holidayNight", label: "Lễ, tết, ban đêm" },
];

export type OvertimeHours = Record<OvertimeRowKey, number>;

const BASE_RATE: Record<OvertimeRowKey, number> = {
  weekdayDay: 1.5,
  weekdayNight: 2.0,
  weeklyRestDay: 2.0,
  weeklyRestNight: 2.7,
  holidayDay: 3.0,
  holidayNight: 3.9,
};

/** Mức của ban đêm ngày thường tăng lên 2,1 nếu có làm thêm ban ngày ngày thường trước đó (150% + 30% + 20% x 150%). */
function rateFor(key: OvertimeRowKey, hadWeekdayDayOvertime: boolean): number {
  if (key === "weekdayNight" && hadWeekdayDayOvertime) return 2.1;
  return BASE_RATE[key];
}

export type OvertimeLine = { key: OvertimeRowKey; label: string; hours: number; rate: number; amount: number };

export type OvertimeResult = {
  hourlyWage: number;
  lines: OvertimeLine[];
  total: number;
};

export function hourlyWageFromMonthly(
  monthlySalary: number,
  workingDays: number = STANDARD_WORKING_DAYS,
  hoursPerDay: number = STANDARD_HOURS_PER_DAY,
): number {
  if (workingDays <= 0 || hoursPerDay <= 0) return 0;
  return monthlySalary / workingDays / hoursPerDay;
}

export function computeOvertime(
  hourlyWage: number,
  hours: OvertimeHours,
  hadWeekdayDayOvertime: boolean,
): OvertimeResult {
  const lines = OVERTIME_ROWS.map(({ key, label }) => {
    const rate = rateFor(key, hadWeekdayDayOvertime);
    const h = hours[key] ?? 0;
    const amount = Math.round(h * rate * hourlyWage);
    return { key, label, hours: h, rate, amount };
  });
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { hourlyWage, lines, total };
}

export const formatVnd = (n: number) => Math.round(n).toLocaleString("vi-VN");
