import Link from "next/link";
import type { Tool } from "@/lib/tools/registry";
import { TOOL_ICON } from "@/app/cong-cu/toolDisplay";
import styles from "./site.module.css";

export function ToolListRow({ tool }: { tool: Tool }) {
  return (
    <Link href={`/cong-cu/${tool.slug}`} className={styles.toolRow}>
      <span className={styles.toolIcon} aria-hidden="true">
        {TOOL_ICON[tool.slug] ?? "•"}
      </span>
      <span>
        <p className={styles.toolTitle}>{tool.name}</p>
        <p className={styles.toolDesc}>{tool.summary}</p>
      </span>
    </Link>
  );
}
