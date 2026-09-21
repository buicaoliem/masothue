import { listIndustryStats } from "@/lib/industry/service";
import { buildStaticMetadata } from "@/lib/seo/metadata";
import { getDataAsOf, getStatusBreakdown } from "@/lib/taxonomy-data";
import { StatsView } from "../../components/StatsView";

export const dynamic = "force-dynamic";

export const metadata = buildStaticMetadata({
  title: "Thống kê doanh nghiệp Việt Nam",
  description: "Thống kê doanh nghiệp trong dữ liệu masothuedn.com: số lượng theo tình trạng hoạt động và ngành nghề phổ biến.",
  path: "/thong-ke/doanh-nghiep-viet-nam",
});

export default async function NationalStats() {
  const [breakdown, stats, dataAsOf] = await Promise.all([getStatusBreakdown(), listIndustryStats(), getDataAsOf()]);
  const registeredTop = stats.slice(0, 15).map((s) => ({ code: s.code, name: s.name, count: s.companyCount }));
  const primaryTop = stats
    .filter((s) => s.primaryCount > 0)
    .sort((a, b) => b.primaryCount - a.primaryCount || a.code.localeCompare(b.code))
    .slice(0, 15)
    .map((s) => ({ code: s.code, name: s.name, count: s.primaryCount }));
  return (
    <StatsView
      title="Thống kê doanh nghiệp Việt Nam"
      crumbs={[
        { name: "Thống kê", path: "/thong-ke" },
        { name: "Doanh nghiệp Việt Nam", path: "/thong-ke/doanh-nghiep-viet-nam" },
      ]}
      scopeLabel="trên toàn quốc"
      breakdown={breakdown}
      registeredTop={registeredTop}
      primaryTop={primaryTop}
      dataAsOf={dataAsOf}
      links={[
        { href: "/doanh-nghiep-moi", label: "Doanh nghiệp mới thành lập" },
        { href: "/nganh", label: "Tất cả ngành nghề" },
        { href: "/phuong-phap-du-lieu", label: "Phương pháp dữ liệu" },
      ]}
    />
  );
}
