"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./vsic.module.css";

export type ExplorerItem = { c: string; l: number; n: string; p?: string; h?: string };

const foldVi = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/\s+/g, " ").trim();

function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={styles.mini}
      aria-label={`Sao chép mã ${code}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {}
      }}
    >
      {done ? "✓ Đã chép" : "Sao chép"}
    </button>
  );
}

function Label({ it }: { it: ExplorerItem }) {
  return (
    <>
      <span className={styles.code}>{it.c}</span>
      <span className={styles.name}>{it.h ? <Link href={it.h}>{it.n}</Link> : it.n}</span>
      <span className={styles.lvl}>Cấp {it.l}</span>
      <CopyCode code={it.c} />
    </>
  );
}

export function Vsic2025Explorer({ items }: { items: ExplorerItem[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const kids = useMemo(() => {
    const m = new Map<string, ExplorerItem[]>();
    for (const it of items) if (it.p) (m.get(it.p) ?? m.set(it.p, []).get(it.p)!).push(it);
    return m;
  }, [items]);
  const folded = useMemo(() => items.map((it) => ({ it, f: foldVi(it.n) })), [items]);

  const query = foldVi(q);
  const results = useMemo(() => {
    if (!query) return null;
    if (/^([a-z]|\d{1,5})$/.test(query)) return items.filter((i) => i.c.toLowerCase().startsWith(query)).slice(0, 60);
    const words = query.split(" ");
    return folded.filter((x) => words.every((w) => x.f.includes(w))).slice(0, 60).map((x) => x.it);
  }, [query, items, folded]);

  const toggle = (c: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (!n.delete(c)) n.add(c);
      return n;
    });

  const render = (it: ExplorerItem) => {
    const ch = kids.get(it.c) ?? [];
    const isOpen = open.has(it.c);
    // Sections and divisions stay in the DOM (hidden) so the server HTML links to every level-2 page; deeper levels mount on demand.
    const mount = ch.length > 0 && (isOpen || it.l <= 2);
    return (
      <li key={it.c} className={styles.node}>
        <div className={styles.row}>
          {ch.length ? (
            <button type="button" className={styles.toggle} aria-expanded={isOpen} aria-label={`${isOpen ? "Thu gọn" : "Mở rộng"} ${it.c}`} onClick={() => toggle(it.c)}>
              {isOpen ? "−" : "+"}
            </button>
          ) : (
            <span className={styles.spacer} />
          )}
          <Label it={it} />
        </div>
        {mount && (
          <ul hidden={!isOpen}>{ch.map(render)}</ul>
        )}
      </li>
    );
  };

  return (
    <div className={styles.explorer}>
      <div className={styles.searchRow} role="search">
        <label htmlFor="vsic-q" className="visually-hidden" style={{ position: "absolute", left: -9999 }}>
          Tìm mã ngành hoặc tên ngành
        </label>
        <input
          id="vsic-q"
          className={styles.searchInput}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nhập mã (62190) hoặc tên ngành, có dấu hoặc không dấu"
          autoComplete="off"
        />
      </div>
      <p className={styles.hintLine}>{results ? `${results.length >= 60 ? "60 kết quả đầu tiên" : `${results.length} kết quả`}` : "Mở rộng từng ngành để xuống các cấp chi tiết, hoặc gõ để tìm."}</p>
      {results ? (
        results.length ? (
          <ul className={styles.results}>
            {results.map((it) => (
              <li key={it.c} className={styles.result}>
                <div className={styles.row}>
                  <Label it={it} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Không có mã ngành nào khớp. Thử bỏ bớt từ khóa hoặc nhập trực tiếp mã.</p>
        )
      ) : (
        <ul className={styles.tree}>{items.filter((i) => i.l === 1).map(render)}</ul>
      )}
    </div>
  );
}
