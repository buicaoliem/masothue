import Link from "next/link";
import { getVsic2025, vsic2025Path } from "@/lib/vsic/catalog";
import type { VsicMapping, VsicRelationship } from "@/lib/vsic/types";
import styles from "./vsic.module.css";

export const RELATIONSHIP_LABEL: Record<VsicRelationship, string> = {
  one_to_one: "1 → 1",
  one_to_many: "1 → nhiều",
  many_to_one: "nhiều → 1",
  many_to_many: "nhiều ↔ nhiều",
  partial: "một phần",
  unknown: "chưa rõ",
};

/** Lists official pairs. Targets in VSIC 2025 link to their reference page when it exists; nothing is chosen for the reader. */
export function VsicMappingTable({ mappings, caption }: { mappings: VsicMapping[]; caption: string }) {
  const showFrom = new Set(mappings.map((m) => m.fromCode)).size > 1;
  return (
    <table className={styles.mapTable}>
      <caption style={{ textAlign: "left", color: "var(--muted)" }}>{caption}</caption>
      <thead>
        <tr>
          {showFrom && <th scope="col">Mã nguồn</th>}
          <th scope="col">Mã tương ứng</th>
          <th scope="col">Tên ngành</th>
          <th scope="col">Quan hệ trong bảng</th>
        </tr>
      </thead>
      <tbody>
        {mappings.map((m) => {
          const e = m.toVersion === "2025" ? getVsic2025(m.toCode) : undefined;
          return (
            <tr key={`${m.fromCode}>${m.toCode}`}>
              {showFrom && <td>{m.fromCode}</td>}
              <td>
                <strong>{m.toCode}</strong>
                {m.flagged ? " (*)" : ""}
              </td>
              <td>{e ? <Link href={vsic2025Path(e)}>{m.toName ?? e.name}</Link> : (m.toName ?? "")}</td>
              <td>
                <span className={styles.rel}>{RELATIONSHIP_LABEL[m.relationship]}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
