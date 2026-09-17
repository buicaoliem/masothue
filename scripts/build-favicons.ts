// One-off generator: renders assets/favicon/*.svg into the site's favicon set.
// Run with: npx tsx scripts/build-favicons.ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const ROOT = path.resolve(__dirname, "..");
const LARGE_SVG = path.join(ROOT, "assets/favicon/mst-large.svg");
const SMALL_SVG = path.join(ROOT, "assets/favicon/mst-small.svg");

async function render(svgPath: string, size: number): Promise<Buffer> {
  const svg = await readFile(svgPath);
  return sharp(svg).resize(size, size).png().toBuffer();
}

async function main() {
  await mkdir(path.join(ROOT, "public"), { recursive: true });

  // app/icon.svg — LARGE variant, used by Next.js for the SVG favicon.
  const largeSvg = await readFile(LARGE_SVG, "utf8");
  await writeFile(path.join(ROOT, "app/icon.svg"), largeSvg);

  // app/favicon.ico — 16 & 32 (SMALL) + 48 (LARGE).
  const [png16, png32, png48] = await Promise.all([
    render(SMALL_SVG, 16),
    render(SMALL_SVG, 32),
    render(LARGE_SVG, 48),
  ]);
  const ico = await pngToIco([png16, png32, png48]);
  await writeFile(path.join(ROOT, "app/favicon.ico"), ico);

  // app/apple-icon.png — 180x180, LARGE, flattened onto white (no transparency).
  const appleSvg = await readFile(LARGE_SVG);
  const appleIcon = await sharp(appleSvg)
    .resize(180, 180)
    .flatten({ background: "#FFFFFF" })
    .png()
    .toBuffer();
  await writeFile(path.join(ROOT, "app/apple-icon.png"), appleIcon);

  // public/icon-192.png & public/icon-512.png — LARGE, for the web manifest.
  const [png192, png512] = await Promise.all([
    render(LARGE_SVG, 192),
    render(LARGE_SVG, 512),
  ]);
  await writeFile(path.join(ROOT, "public/icon-192.png"), png192);
  await writeFile(path.join(ROOT, "public/icon-512.png"), png512);

  console.log("Favicons generated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
