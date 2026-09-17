import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DIRECTORY_GROUPS, findDirectoryGroup, getActivePlacements, isIndexable, type PublicProfile } from "@/lib/directory";
import {
  countProfilesFiltered,
  DIRECTORY_PAGE_SIZE,
  getGroupSlugsForProvince,
  getProvinceSlugsForGroup,
  listProfilesFiltered,
  type ProfileFilter,
} from "@/lib/directory-web";
import { PROVINCES } from "@/pipeline/province";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { REL_EXTERNAL_SPONSORED } from "@/lib/relAttrs";
import { LogoTile } from "../../../components/LogoTile";
import siteStyles from "../../../components/site.module.css";
import dirStyles from "../../../components/directory.module.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ group: string; province: string }>;
  searchParams: Promise<{ trang?: string | string[]; loc?: string | string[] }>;
};

const findProvince = (slug: string) => PROVINCES.find((p) => p.slug === slug);
const FILTERS: { key: ProfileFilter; label: string }[] = [
  { key: "active", label: "Đang hoạt động" },
  { key: "all", label: "Tất cả" },
  { key: "complete", label: "Có hồ sơ đầy đủ" },
];

function parsePage(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && /^[1-9]\d{0,5}$/.test(v) ? Number(v) : 1;
}

function parseFilter(raw: string | string[] | undefined): ProfileFilter {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "all" || v === "complete" ? v : "active";
}

const path = (group: string, province: string, filter: ProfileFilter, page: number) => {
  const qs = new URLSearchParams();
  if (filter !== "active") qs.set("loc", filter);
  if (page > 1) qs.set("trang", String(page));
  const q = qs.toString();
  return `/danh-ba/${group}/${province}${q ? `?${q}` : ""}`;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group: groupSlug, province: provinceSlug } = await params;
  const group = findDirectoryGroup(groupSlug);
  const province = findProvince(provinceSlug);
  if (!group || !province) return {};
  const indexable = await isIndexable(groupSlug, provinceSlug);
  return {
    title: `${group.label} tại ${province.displayName} | ${SITE_NAME}`,
    description: `Danh sách doanh nghiệp ${group.label.toLowerCase()} tại ${province.displayName}.`,
    alternates: { canonical: `${SITE_URL}/danh-ba/${groupSlug}/${provinceSlug}` },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

function ProfileCard({ p }: { p: PublicProfile }) {
  return (
    <div className={dirStyles.f}>
      <LogoTile mst={p.mst} name={p.companyName} logoUrl={p.logoUrl} size="md" />
      <h4 className={dirStyles.fName}>
        <Link href={`/${p.mst}`}>{p.companyName}</Link>
      </h4>
      <p className={dirStyles.fDesc}>{p.description}</p>
      <div className={`${dirStyles.act} ${dirStyles.fAct}`}>
        {p.publicPhone && (
          <a href={`tel:${p.publicPhone}`} className={`${dirStyles.btn} ${dirStyles.btnGhost}`}>
            Gọi điện
          </a>
        )}
        {p.publicZalo && (
          <a
            href={`https://zalo.me/${p.publicZalo}`}
            target="_blank"
            rel={REL_EXTERNAL_SPONSORED}
            className={`${dirStyles.btn} ${dirStyles.btnGold}`}
          >
            Nhắn Zalo
          </a>
        )}
      </div>
    </div>
  );
}

export default async function DirectoryGroupProvincePage({ params, searchParams }: Props) {
  const { group: groupSlug, province: provinceSlug } = await params;
  const group = findDirectoryGroup(groupSlug);
  const province = findProvince(provinceSlug);
  if (!group || !province) notFound();

  const sp = await searchParams;
  const filter = parseFilter(sp.loc);
  const page = parsePage(sp.trang);

  const [placements, total, otherGroupsInProvince, otherProvincesForGroup] = await Promise.all([
    getActivePlacements(groupSlug, provinceSlug),
    countProfilesFiltered(groupSlug, provinceSlug, filter),
    getGroupSlugsForProvince(provinceSlug),
    getProvinceSlugsForGroup(groupSlug),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE));
  if (page > pageCount && total > 0) notFound();
  const featuredMsts = new Set(placements.map((p) => p.mst));
  const rows = total > 0 ? (await listProfilesFiltered(groupSlug, provinceSlug, page, filter)).filter((p) => !featuredMsts.has(p.mst)) : [];

  const relatedGroups = DIRECTORY_GROUPS.filter((g) => g.slug !== groupSlug && otherGroupsInProvince.includes(g.slug));
  const otherProvinces = PROVINCES.filter((p) => p.slug !== provinceSlug && otherProvincesForGroup.includes(p.slug)).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "vi"),
  );

  const emptySlots = Math.max(0, 3 - placements.length);

  return (
    <main className={siteStyles.page}>
      <div className={dirStyles.crumb}>
        <Link href="/">Trang chủ</Link> / <Link href="/danh-ba">Danh bạ</Link> /{" "}
        <Link href={`/danh-ba/tinh/${provinceSlug}`}>{province.displayName}</Link> / {group.label}
      </div>

      <div className={siteStyles.section} style={{ marginTop: 0 }}>
        <h1 className={siteStyles.title}>
          {group.label} tại {province.displayName}
        </h1>
        <p className={siteStyles.lead}>
          {total === 0
            ? "Trang ngành chưa đủ doanh nghiệp. Trang dạng này không đưa lên Google cho tới khi đủ."
            : `${total.toLocaleString("vi-VN")} doanh nghiệp`}
        </p>
        {total > 0 && (
          <div className={dirStyles.filterbar}>
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={path(groupSlug, provinceSlug, f.key, 1)}
                className={`${dirStyles.filterBtn} ${f.key === filter ? dirStyles.filterBtnOn : ""}`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className={dirStyles.top}>
        <h2>Đứng đầu ngành</h2>
        <p className={dirStyles.topSub}>Vị trí tài trợ</p>
        <div className={dirStyles.feat}>
          {placements.map((p) => (
            <ProfileCard key={p.mst} p={p} />
          ))}
          {emptySlots > 0 && (
            <div className={`${dirStyles.f} ${dirStyles.fEmpty}`}>
              <div className={dirStyles.logoBox}>+</div>
              <h4 className={dirStyles.fName}>Vị trí này đang trống</h4>
              <p className={dirStyles.fDesc}>Đưa doanh nghiệp của bạn lên đầu trang ngành này.</p>
              <div className={`${dirStyles.act} ${dirStyles.fAct}`}>
                <Link href={`/vi-tri-noi-bat?nhom=${groupSlug}&tinh=${provinceSlug}`} className={`${dirStyles.btn} ${dirStyles.btnGold}`}>
                  Đăng ký vị trí
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {total === 0 ? (
        <div className={dirStyles.emptyRow}>
          <h3>Chưa có doanh nghiệp nào cập nhật ngành này</h3>
          <p>
            Doanh nghiệp {group.label.toLowerCase()} ở {province.displayName} có thể tự thêm hồ sơ miễn phí.
          </p>
          <div className={dirStyles.act}>
            <Link href="/cap-nhat-ho-so" className={dirStyles.btn}>
              Thêm doanh nghiệp của bạn
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className={dirStyles.list}>
            <h2>Tất cả doanh nghiệp</h2>
            {rows.length === 0 ? (
              <p className={siteStyles.empty}>Không có doanh nghiệp nào khớp bộ lọc này.</p>
            ) : (
              rows.map((p) => (
                <div key={p.mst} className={dirStyles.row}>
                  <LogoTile mst={p.mst} name={p.companyName} logoUrl={p.logoUrl} size="sm" />
                  <div className={dirStyles.rowInfo}>
                    <h4 className={dirStyles.rowName}>
                      <Link href={`/${p.mst}`}>{p.companyName}</Link>
                    </h4>
                    <div className={dirStyles.rowMeta}>{p.address}</div>
                    <div className={dirStyles.rowMeta}>MST {p.mst}</div>
                  </div>
                  <div className={dirStyles.act}>
                    <Link href={`/${p.mst}`} className={`${dirStyles.btn} ${dirStyles.btnGhost}`}>
                      Xem hồ sơ
                    </Link>
                  </div>
                </div>
              ))
            )}
            {pageCount > 1 && (
              <nav className={dirStyles.numPager} aria-label="Phân trang">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={path(groupSlug, provinceSlug, filter, n)}
                    className={`${dirStyles.numPagerLink} ${n === page ? dirStyles.numPagerOn : ""}`}
                  >
                    {n}
                  </Link>
                ))}
                {page < pageCount && (
                  <Link href={path(groupSlug, provinceSlug, filter, page + 1)} className={dirStyles.numPagerLink} rel="next">
                    Trang sau
                  </Link>
                )}
              </nav>
            )}
          </div>

          <div className={dirStyles.related}>
            <div className={dirStyles.box}>
              <h3>Ngành liên quan tại {province.displayName}</h3>
              {relatedGroups.length === 0 ? (
                <p className={siteStyles.empty}>Chưa có ngành liên quan.</p>
              ) : (
                <div className={siteStyles.chips}>
                  {relatedGroups.map((g) => (
                    <Link key={g.slug} href={`/danh-ba/${g.slug}/${provinceSlug}`} className={siteStyles.chip}>
                      {g.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className={dirStyles.box}>
              <h3>{group.label} ở tỉnh khác</h3>
              {otherProvinces.length === 0 ? (
                <p className={siteStyles.empty}>Chưa có tỉnh khác.</p>
              ) : (
                <div className={siteStyles.chips}>
                  {otherProvinces.map((p) => (
                    <Link key={p.slug} href={`/danh-ba/${groupSlug}/${p.slug}`} className={siteStyles.chip}>
                      {p.displayName}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
