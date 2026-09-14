"use client";

import { usePathname } from "next/navigation";
import { SearchForm } from "./SearchForm";
import styles from "./site.module.css";

/** Header search box; left out on the home page, which has its own large one. */
export function HeaderSearch() {
  const isHome = usePathname() === "/";
  // The wrapper stays on the home page so the menu keeps its position.
  return (
    <div className={`${styles.headerSearch} ${isHome ? styles.headerSearchEmpty : ""}`}>
      {!isHome && <SearchForm />}
    </div>
  );
}
