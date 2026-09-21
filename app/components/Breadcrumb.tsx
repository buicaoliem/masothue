import Link from "next/link";
import { breadcrumbJsonLd, withHome, type Crumb } from "@/lib/seo/jsonld";
import { JsonLd } from "./JsonLd";
import styles from "./site.module.css";

/** Crawlable breadcrumb (anchors) + BreadcrumbList JSON-LD. The last crumb is the current page and is not linked. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  const all = withHome(items);
  return (
    <>
      <nav className={styles.crumb} aria-label="Breadcrumb">
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "inline" }}>
          {all.map((c, i) => (
            <li key={c.path} style={{ display: "inline" }}>
              {i > 0 && " / "}
              {i < all.length - 1 ? (
                <Link href={c.path}>{c.name}</Link>
              ) : (
                <span aria-current="page">{c.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(all)} />
    </>
  );
}
