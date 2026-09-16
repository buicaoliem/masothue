import styles from "./directory.module.css";

// Stable color/initials derived from the MST and name, so a business without a logo still
// gets a recognizable tile that doesn't change between renders.

const STOPWORDS = new Set(["cong", "ty", "cty", "tnhh", "mtv", "co", "phan", "doanh", "nghiep", "tu", "nhan"]);
const PALETTE = ["#1B4DB1", "#0F7B6C", "#8A4FD1", "#C2410C", "#B45309", "#166534", "#9D174D", "#334155"];

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d");
}

export function colorForMst(mst: string): string {
  let h = 0;
  for (let i = 0; i < mst.length; i++) h = (h * 31 + mst.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const significant = words.filter((w) => !STOPWORDS.has(stripDiacritics(w).toLowerCase()));
  const pick = (significant.length ? significant : words).slice(0, 2);
  const text = pick.map((w) => stripDiacritics(w)[0]?.toUpperCase() ?? "").join("");
  return text || "?";
}

const SIZES = { sm: 52, md: 64, lg: 88 } as const;

type Props = { mst: string; name: string; logoUrl?: string | null; size?: keyof typeof SIZES };

export function LogoTile({ mst, name, logoUrl, size = "md" }: Props) {
  const px = SIZES[size];
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logoUrl}
        alt=""
        width={px}
        height={px}
        className={styles.logoBox}
        style={{ width: px, height: px, objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      className={styles.logoBox}
      style={{ width: px, height: px, background: colorForMst(mst), fontSize: Math.round(px * 0.32) }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
