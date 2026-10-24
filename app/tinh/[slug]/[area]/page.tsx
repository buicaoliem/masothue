import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROVINCES } from "@/pipeline/province";
import { getProvinceAreaIndex, linkableWards } from "@/lib/area-index";
import { areaPath, parsePage, provincePath } from "@/lib/seo/urls";
import { LIST_PAGE_SIZE } from "@/lib/taxonomy-data";
import { AreaHub, areaHubMetadata } from "../../../components/AreaHub";

export const revalidate = 86400;
export const dynamicParams = true;

type Props = {
  params: Promise<{ slug: string; area: string }>;
  searchParams: Promise<{ trang?: string | string[] }>;
};

async function load(props: Props) {
  const { slug, area } = await props.params;
  const province = PROVINCES.find((p) => p.slug === slug);
  const page = parsePage((await props.searchParams).trang);
  if (!province || !page) return null;
  const district = (await getProvinceAreaIndex(slug)).districts.get(area);
  if (!district) return null;
  return { province, district, page, placeLabel: `${district.unit.name}, ${province.displayName}` };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const d = await load(props);
  if (!d) return {};
  return areaHubMetadata({ placeLabel: d.placeLabel, path: areaPath(d.province.slug, d.district.unit.slug), total: d.district.companies.length, page: d.page });
}

export default async function DistrictHub(props: Props) {
  const d = await load(props);
  if (!d) notFound();
  const { province, district, page } = d;
  if (page > Math.max(1, Math.ceil(district.companies.length / LIST_PAGE_SIZE))) notFound();
  return (
    <AreaHub
      crumbs={[
        { name: province.displayName, path: provincePath(province.slug) },
        { name: district.unit.name, path: areaPath(province.slug, district.unit.slug) },
      ]}
      placeLabel={d.placeLabel}
      provinceName={province.displayName}
      companies={district.companies}
      page={page}
      hrefFor={(p) => areaPath(province.slug, district.unit.slug, undefined, p)}
      areaLinks={{
        title: `Phường, xã thuộc ${district.unit.name}`,
        items: linkableWards(district).map((w) => ({ href: areaPath(province.slug, district.unit.slug, w.unit.slug), label: `${w.unit.name} (${w.companies.length.toLocaleString("vi-VN")})` })),
      }}
      upLink={{ href: provincePath(province.slug), label: `Xem tất cả doanh nghiệp tại ${province.displayName}` }}
    />
  );
}
