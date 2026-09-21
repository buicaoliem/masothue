import { REL_EXTERNAL_INFO } from "@/lib/relAttrs";
import { VSIC_2025_LABEL, VSIC_DATA_CHECKED_AT_VN, VSIC_SOURCES } from "@/lib/vsic/sources";
import styles from "./vsic.module.css";

/** Provenance block shown on every VSIC 2025 / conversion page: source, document numbers, version, effective date, check date. */
export function VsicProvenance({ conversion = false }: { conversion?: boolean }) {
  return (
    <dl className={styles.prov}>
      <dt>Nguồn</dt>
      <dd>
        <a href={VSIC_SOURCES.decision.url} target="_blank" rel={REL_EXTERNAL_INFO}>{VSIC_SOURCES.decision.label}</a>
        {conversion && (
          <>
            <br />
            <a href={VSIC_SOURCES.conversion.url} target="_blank" rel={REL_EXTERNAL_INFO}>{VSIC_SOURCES.conversion.label}</a>
          </>
        )}
      </dd>
      <dt>Số hiệu văn bản</dt>
      <dd>{conversion ? "36/2025/QĐ-TTg; Công văn 3061/CTK-CSCL (bảng chuyển đổi)" : "36/2025/QĐ-TTg"}</dd>
      <dt>Phiên bản VSIC</dt>
      <dd>{conversion ? "VSIC 2018 và VSIC 2025" : VSIC_2025_LABEL}</dd>
      <dt>Ngày hiệu lực</dt>
      <dd>15/11/2025 (Quyết định 36/2025/QĐ-TTg thay Quyết định 27/2018/QĐ-TTg)</dd>
      <dt>Ngày dữ liệu được đối chiếu</dt>
      <dd>{VSIC_DATA_CHECKED_AT_VN}</dd>
    </dl>
  );
}
