import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = { metadataBase: new URL(SITE_URL), title: SITE_NAME };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      {/* Light-only design for now: pin colors so a dark browser theme doesn't hide text. */}
      <body style={{ margin: 0, background: "#fff", color: "#1f2937", colorScheme: "light" }}>{children}</body>
    </html>
  );
}
