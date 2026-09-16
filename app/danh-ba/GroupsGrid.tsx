"use client";

import { useState } from "react";
import styles from "../components/directory.module.css";
import siteStyles from "../components/site.module.css";

type GroupCount = { slug: string; label: string; count: number };

export function GroupsGrid({ groups }: { groups: GroupCount[] }) {
  const [showAll, setShowAll] = useState(false);
  const withData = groups.filter((g) => g.count > 0);
  const empty = groups.filter((g) => g.count === 0);
  const visible = showAll ? groups : withData;

  return (
    <>
      <ul className={styles.groupsGrid} style={{ listStyle: "none", padding: 0, margin: "20px 0 0" }}>
        {visible.map((g) => (
          <li key={g.slug} className={styles.groupCard}>
            <span className={styles.groupCardName}>{g.label}</span>
            <span className={styles.groupCardCount}>
              {g.count > 0 ? `${g.count.toLocaleString("vi-VN")} doanh nghiệp` : "Chưa có doanh nghiệp"}
            </span>
          </li>
        ))}
      </ul>
      {!showAll && empty.length > 0 && (
        <div className={siteStyles.moreRow} style={{ justifyContent: "center", marginTop: 16 }}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowAll(true)}>
            Xem tất cả ngành
          </button>
        </div>
      )}
    </>
  );
}
