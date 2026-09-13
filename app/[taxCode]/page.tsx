import { notFound } from "next/navigation";
import { getCompany } from "@/lib/company";
import styles from "./company.module.css";

type Props = { params: Promise<{ taxCode: string }> };

function statusTone(status: string): "active" | "stopped" | "neutral" {
  const s = status.toLowerCase();
  if (s.includes("ngừng") || s.includes("chấm dứt") || s.includes("giải thể")) return "stopped";
  if (s.includes("đang hoạt động")) return "active";
  return "neutral";
}

export default async function CompanyPage({ params }: Props) {
  const { taxCode } = await params;
  const company = await getCompany(taxCode);
  if (!company) notFound();

  const rows = [
    ["Mã số thuế", company.taxCode],
    ["Địa chỉ", company.address],
    ["Tỉnh / Thành phố", company.province],
    ["Tình trạng", company.status],
    ["Người đại diện", company.representativeName],
    ["Ngành nghề chính", company.mainIndustry],
  ].filter((r): r is [string, string] => Boolean(r[1]));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.name}>{company.name ?? `Mã số thuế ${company.taxCode}`}</h1>
        <p className={styles.taxCode}>
          Mã số thuế: <strong>{company.taxCode}</strong>
        </p>
        {company.status && (
          <span className={`${styles.badge} ${styles[statusTone(company.status)]}`}>{company.status}</span>
        )}
      </header>

      {company.name ? (
        <dl className={styles.info}>
          {rows.map(([label, value]) => (
            <div key={label} className={styles.row}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={styles.empty}>Thông tin doanh nghiệp đang được cập nhật.</p>
      )}
    </main>
  );
}
