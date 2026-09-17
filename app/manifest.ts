import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "masothuedn.com – Tra cứu mã số thuế",
    short_name: "masothuedn",
    theme_color: "#1B4DB1",
    background_color: "#FFFFFF",
    display: "standalone",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
