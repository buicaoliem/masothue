import type { Prisma } from "@prisma/client";
import { slugify } from "./slug";

// Static taxonomy definitions that are meaningful search intents. Legal forms are derived from
// the data (Company.legalType is free text), statuses are a closed set of three.

export type StatusPage = {
  slug: string;
  label: string;
  /** H1 / breadcrumb text. */
  title: string;
  description: string;
  where: Prisma.CompanyWhereInput;
};

const containsCI = (s: string): Prisma.CompanyWhereInput => ({ status: { contains: s, mode: "insensitive" } });

// Wordings seen in Company.status: tax-office text ("NNT ngừng hoạt động...") and registry text
// ("Đã giải thể, phá sản, chấm dứt tồn tại", "Bị thu hồi giấy chứng nhận...", "Không còn hoạt động kinh doanh...").
const STOPPED_KEYWORDS = ["ngừng hoạt động", "giải thể", "chấm dứt", "phá sản", "thu hồi", "không còn hoạt động"];

export const STATUS_PAGES: readonly StatusPage[] = [
  {
    slug: "dang-hoat-dong",
    label: "Đang hoạt động",
    title: "Doanh nghiệp đang hoạt động",
    description: "Doanh nghiệp có tình trạng đang hoạt động theo dữ liệu đăng ký công khai.",
    where: { AND: [containsCI("đang hoạt động"), { NOT: containsCI("ngừng") }] },
  },
  {
    slug: "tam-ngung",
    label: "Tạm ngừng",
    title: "Doanh nghiệp tạm ngừng kinh doanh",
    description: "Doanh nghiệp có tình trạng tạm ngừng kinh doanh theo dữ liệu đăng ký công khai.",
    where: containsCI("tạm ngừng"),
  },
  {
    slug: "ngung-hoat-dong",
    label: "Ngừng hoạt động",
    title: "Doanh nghiệp ngừng hoạt động, giải thể, bị thu hồi",
    description: "Doanh nghiệp đã ngừng hoạt động, giải thể, chấm dứt tồn tại hoặc bị thu hồi giấy chứng nhận đăng ký theo dữ liệu công khai.",
    where: {
      AND: [
        { NOT: containsCI("tạm ngừng") },
        { OR: STOPPED_KEYWORDS.map(containsCI) },
      ],
    },
  },
];

export const findStatusPage = (slug: string) => STATUS_PAGES.find((s) => s.slug === slug);

/** "Công ty trách nhiệm hữu hạn một thành viên" -> "cong-ty-tnhh-mot-thanh-vien" (the form people actually search). */
export const legalFormSlug = (legalType: string) => slugify(legalType).replace("trach-nhiem-huu-han", "tnhh");

/** JS-side twin of the `where` clauses above; keeps page links and hub membership consistent. */
export function classifyStatus(status: string): StatusPage | undefined {
  const s = status.toLowerCase();
  if (s.includes("tạm ngừng")) return findStatusPage("tam-ngung");
  if (STOPPED_KEYWORDS.some((k) => s.includes(k))) return findStatusPage("ngung-hoat-dong");
  if (s.includes("đang hoạt động") && !s.includes("ngừng")) return findStatusPage("dang-hoat-dong");
  return undefined;
}
