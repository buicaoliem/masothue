import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import styles from "./components/site.module.css";

export const metadata: Metadata = { metadataBase: new URL(SITE_URL), title: SITE_NAME };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      {/* Light-only design for now: pin colors so a dark browser theme doesn't hide text. */}
      <body style={{ margin: 0, background: "#fff", color: "#1f2937", colorScheme: "light" }}>
        <div className={styles.shell}>
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
