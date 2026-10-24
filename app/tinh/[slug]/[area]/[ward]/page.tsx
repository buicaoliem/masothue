import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROVINCES } from "@/pipeline/province";
import { getProvinceAreaIndex, linkableWards } from "@/lib/area-index";
import { areaPath, parsePage, provincePath } from "@/lib/seo/urls";
import { LIST_PAGE_SIZE } from "@/lib/taxonomy-data";
import { AreaHub, areaHubMetadata } from "../../../../components/AreaHub";

export const revalidate = 86400;
export const dynamicParams = true;

type Props = {
  params: Promise<{ slug: string; area: string; ward: string }>;
  searchParams: Promise<{ trang?: string | string[] }>;
};

async function load(props: Props) {
  const { slug, area, ward: wardSlug } = await props.params;
  const province = PROVINCES.find((p) => p.slug === slug);
  const page = parsePage((await props.searchParams).trang);
  if (!province || !page) return null;
  const district = (await getProvinceAreaIndex(slug)).districts.get(area);
  const ward = district?.wards.get(wardSlug);
  if (!district || !ward) return null;
  return { province, district, ward, page, placeLabel: `${ward.unit.name}, ${district.unit.name}, ${province.displayName}` };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const d = await load(props);
  if (!d) return {};
  return areaHubMetadata({
    placeLabel: d.placeLabel,
    path: areaPath(d.province.slug, d.district.unit.slug, d.ward.unit.slug),
    total: d.ward.companies.length,
    page: d.page,
  });
}

export default async function WardHub(props: Props) {
  const d = await load(props);
  if (!d) notFound();
  const { province, district, ward, page } = d;
  if (page > Math.max(1, Math.ceil(ward.companies.length / LIST_PAGE_SIZE))) notFound();
  return (
    <AreaHub
      crumbs={[
        { name: province.displayName, path: provincePath(province.slug) },
        { name: district.unit.name, path: areaPath(province.slug, district.unit.slug) },
        { name: ward.unit.name, path: areaPath(province.slug, district.unit.slug, ward.unit.slug) },
      ]}
      placeLabel={d.placeLabel}
      provinceName={province.displayName}
      companies={ward.companies}
      page={page}
      hrefFor={(p) => areaPath(province.slug, district.unit.slug, ward.unit.slug, p)}
      areaLinks={{
        title: `Phường, xã khác thuộc ${district.unit.name}`,
        items: linkableWards(district)
          .filter((w) => w.unit.slug !== ward.unit.slug)
          .map((w) => ({ href: areaPath(province.slug, district.unit.slug, w.unit.slug), label: `${w.unit.name} (${w.companies.length.toLocaleString("vi-VN")})` })),
      }}
      upLink={{ href: areaPath(province.slug, district.unit.slug), label: `Xem tất cả doanh nghiệp tại ${district.unit.name}` }}
    />
  );
}
