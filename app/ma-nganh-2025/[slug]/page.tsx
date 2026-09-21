import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ancestorsOf, childrenOf, getVsic2025, LEVEL_LABEL, parseVsic2025Slug, VSIC_2025_ROOT, vsic2025Path } from "@/lib/vsic/catalog";
import { getVsic2025Content, isEntryIndexable } from "@/lib/vsic/content";
import { officialSourcesFor2025 } from "@/lib/vsic/convert";

import { buildPageMetadata } from "@/lib/seo/metadata";
import { SITE_NAME } from "@/lib/site";
import { Breadcrumb } from "../../components/Breadcrumb";
import styles from "../../components/site.module.css";
import { VsicMappingTable } from "../VsicMappingTable";
import { VsicProvenance } from "../VsicProvenance";
import v from "../vsic.module.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = parseVsic2025Slug((await params).slug);
  const e = parsed && getVsic2025(parsed.code);
  if (!e) return {};
  const content = getVsic2025Content(e.code);
  const first = (content?.d ?? []).find((p) => !/^Loại trừ/.test(p)) ?? "";
  return buildPageMetadata({
    title: `Mã ngành ${e.code} - ${e.name} (VSIC 2025) | ${SITE_NAME}`,
    description: `Mã ngành ${e.code}: ${e.name} theo Quyết định 36/2025/QĐ-TTg (VSIC 2025). ${first}`,
    path: vsic2025Path(e),
    index: isEntryIndexable(e),
  });
}

export default async function Vsic2025Detail({ params }: Props) {
  const param = (await params).slug;
  const parsed = parseVsic2025Slug(param);
  const e = parsed && getVsic2025(parsed.code);
  if (!e) notFound();
  const canonical = vsic2025Path(e);
  if (`${VSIC_2025_ROOT}/${param}` !== canonical) permanentRedirect(canonical);

  const content = getVsic2025Content(e.code);
  const chain = ancestorsOf(e.code);
  const parent = chain[chain.length - 1];
  const kids = childrenOf(e.code);
  const back = officialSourcesFor2025(e.code);
  const crumbs = [{ name: "Mã ngành 2025", path: VSIC_2025_ROOT }, ...chain.map((a) => ({ name: `${a.code} ${a.name}`, path: vsic2025Path(a) })), { name: `${e.code} ${e.name}`, path: canonical }];

  return (
    <main className={styles.page}>
      <Breadcrumb items={crumbs} />
      <h1 className={styles.title}>
        Mã ngành {e.code}: {e.name}
      </h1>
      <p className={styles.lead}>
        {LEVEL_LABEL[e.level]} trong Hệ thống ngành kinh tế Việt Nam theo Quyết định 36/2025/QĐ-TTg (VSIC 2025).
        {parent ? ` Thuộc ${parent.code} - ${parent.name}.` : ""}
      </p>
      <div className={v.notice}>
        Trang này mô tả mã theo <strong>VSIC 2025</strong>. Dữ liệu doanh nghiệp trên masothuedn.com vẫn theo mã VSIC 2018 như nguồn công bố; cùng một dãy số có thể có nghĩa khác giữa hai hệ.
      </div>

      {content?.d?.length ? (
        <section className={`${styles.section} ${v.prose}`}>
          <h2 className={styles.sectionTitle}>Nội dung theo văn bản</h2>
          {content.d.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      ) : null}
      {content?.x?.length ? (
        <section className={`${styles.section} ${v.prose}`}>
          <h2 className={styles.sectionTitle}>Loại trừ</h2>
          {content.x.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      ) : null}

      {kids.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ngành con</h2>
          <ul className={v.cols}>
            {kids.map((k) => (
              <li key={k.code}>
                <strong>{k.code}</strong> <Link href={vsic2025Path(k)}>{k.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mã tương ứng trong VSIC 2018</h2>
        {back.length > 0 ? (
          <>
            <VsicMappingTable mappings={back} caption={`Mã VSIC 2018 tương ứng với ${e.code} theo bảng chuyển đổi chính thức`} />
            {back.some((m) => m.relationship !== "one_to_one" || m.flagged) && (
              <p className={v.warn}>Cần đối chiếu hoạt động thực tế để chọn mã phù hợp. Bảng chính thức thể hiện quan hệ tách, gộp hoặc có đánh dấu (*); chúng tôi không chọn hộ.</p>
            )}
          </>
        ) : (
          <p className={v.empty}>Bảng chuyển đổi chính thức không có dòng riêng cho mã này. Xem mã cấp trên hoặc <Link href="/cong-cu/chuyen-doi-ma-nganh-2018-2025">công cụ chuyển đổi</Link>.</p>
        )}
        <p>
          Tra ngược từ mã cũ: <Link href="/cong-cu/chuyen-doi-ma-nganh-2018-2025">công cụ chuyển đổi mã ngành 2018 - 2025</Link>.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Nguồn và phiên bản</h2>
        <VsicProvenance conversion />
      </section>
    </main>
  );
}
