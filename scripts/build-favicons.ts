// One-off generator: renders assets/favicon/*.svg into the site's favicon set.
// The "MST" glyphs are drawn from a real font (extracted via opentype.js) so
// the letters are smooth vector shapes, not pixel/rect-grid approximations.
// Run with: npx tsx scripts/build-favicons.ts
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import pngToIco from "png-to-ico";
import opentype from "opentype.js";

const ROOT = path.resolve(__dirname, "..");
const LARGE_SVG = path.join(ROOT, "assets/favicon/mst-large.svg");
const SMALL_SVG = path.join(ROOT, "assets/favicon/mst-small.svg");

const BLUE = "#1B4DB1";
const WHITE = "#FFFFFF";
const CORNER_RADIUS = 14;
const GRID = 64;

// Primary font: Be Vietnam Pro ExtraBold (SIL OFL). Fallback: JetBrains Mono
// ExtraBold (also SIL OFL) if the primary download fails for any reason.
const PRIMARY_FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/BeVietnamPro-ExtraBold.ttf";
const FALLBACK_FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono[wght].ttf";

let usedFallbackFont = false;

async function downloadFont(): Promise<{ buffer: Buffer; usedFallback: boolean }> {
  try {
    const res = await fetch(PRIMARY_FONT_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, usedFallback: false };
  } catch (err) {
    console.warn(
      `Primary font (Be Vietnam Pro ExtraBold) download failed: ${(err as Error).message}. Falling back to JetBrains Mono ExtraBold.`
    );
    const res = await fetch(FALLBACK_FONT_URL);
    if (!res.ok) throw new Error(`Fallback font download failed: HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, usedFallback: true };
  }
}

/**
 * Build an SVG <path> "d" string for the text "MST" set in the given font,
 * scaled to the requested cap height, horizontally centered around cx, with
 * its top edge at `top`. Uses opentype.js getPath()/getPaths() so the result
 * is real vector glyph outlines (no <text>, no pixel grid).
 */
function buildMstPath(
  font: opentype.Font,
  capHeightUnits: number,
  cx: number,
  top: number,
  letterSpacing: number
): { d: string; width: number } {
  const unitsPerEm = font.unitsPerEm;
  // Cap height (height of capital letters) approximated via ascender, since
  // opentype.js doesn't expose a direct "capHeight" for all fonts reliably.
  const os2CapHeight = (font.tables as { os2?: { sCapHeight?: number } })?.os2?.sCapHeight;
  const capHeightFontUnits = os2CapHeight && os2CapHeight > 0 ? os2CapHeight : font.ascender * 0.72;
  const fontSize = (capHeightUnits / capHeightFontUnits) * unitsPerEm;

  const text = "MST";
  // First pass: measure total width with letter spacing so we can center it.
  let totalWidth = 0;
  const glyphWidths: number[] = [];
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const w = (glyph.advanceWidth ?? 0) * (fontSize / unitsPerEm);
    glyphWidths.push(w);
    totalWidth += w;
  }
  totalWidth += letterSpacing * (text.length - 1);

  const startX = cx - totalWidth / 2;
  const baselineY = top + capHeightUnits;

  let x = startX;
  const pathStrings: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const glyphPath = font.getPath(ch, x, baselineY, fontSize);
    pathStrings.push(glyphPath.toPathData(3));
    x += glyphWidths[i] + letterSpacing;
  }

  return { d: pathStrings.join(" "), width: totalWidth };
}

function roundedSquareSvg(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}">
  <rect x="0" y="0" width="${GRID}" height="${GRID}" rx="${CORNER_RADIUS}" fill="${BLUE}"/>
${inner}
</svg>
`;
}

function buildLargeSvg(font: opentype.Font): string {
  // Cap height ~13 units, positioned in the top half of the 64x64 square.
  const capHeight = 13;
  const top = 14; // top edge of the letters, within the top half
  const letterSpacing = -0.6; // slightly tight tracking
  const { d } = buildMstPath(font, capHeight, GRID / 2, top, letterSpacing);

  const boxes = `  <rect x="10" y="39" width="9" height="12" rx="2" fill="${WHITE}"/>
  <rect x="22" y="39" width="9" height="12" rx="2" fill="${WHITE}"/>
  <rect x="34" y="39" width="9" height="12" rx="2" fill="${WHITE}"/>
  <rect x="46" y="39" width="8" height="12" rx="2" fill="none" stroke="${WHITE}" stroke-width="2" stroke-dasharray="2 2"/>`;

  const inner = `  <path d="${d}" fill="${WHITE}"/>\n${boxes}`;
  return roundedSquareSvg(inner);
}

function buildSmallSvg(font: opentype.Font): string {
  // "MST" as large as fits with ~6 units of side padding, vertically
  // centered in the square. No boxes.
  const padding = 6;
  const maxWidth = GRID - padding * 2;
  const letterSpacing = -0.8; // tighter tracking so it reads clearly at 16px

  // Binary-search-ish: start from a candidate cap height and scale to fit width.
  let capHeight = 30;
  let { d, width } = buildMstPath(font, capHeight, GRID / 2, 0, letterSpacing);
  if (width > maxWidth) {
    const scale = maxWidth / width;
    capHeight *= scale;
    ({ d, width } = buildMstPath(font, capHeight, GRID / 2, 0, letterSpacing * scale));
  }

  // Vertically center: re-render with top computed from desired centering.
  const top = (GRID - capHeight) / 2;
  ({ d } = buildMstPath(font, capHeight, GRID / 2, top, letterSpacing));

  const inner = `  <path d="${d}" fill="${WHITE}"/>`;
  return roundedSquareSvg(inner);
}

async function render(svgPath: string, size: number): Promise<Buffer> {
  const svg = await readFile(svgPath);
  return sharp(svg).resize(size, size).png().toBuffer();
}

async function renderBuffer(svgBuffer: Buffer, size: number): Promise<Buffer> {
  return sharp(svgBuffer).resize(size, size).png().toBuffer();
}

async function main() {
  await mkdir(path.join(ROOT, "public"), { recursive: true });

  // Download the font into a temp folder at run time; never committed/shipped.
  const tmpDir = path.join(tmpdir(), `masothue-favicon-font-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
  const { buffer: fontBuffer, usedFallback } = await downloadFont();
  usedFallbackFont = usedFallback;
  const fontPath = path.join(tmpDir, "favicon-font.ttf");
  await writeFile(fontPath, fontBuffer);

  let font: opentype.Font;
  try {
    font = opentype.parse(
      fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength)
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }

  const largeSvg = buildLargeSvg(font);
  const smallSvg = buildSmallSvg(font);

  await writeFile(LARGE_SVG, largeSvg);
  await writeFile(SMALL_SVG, smallSvg);

  // app/icon.svg — LARGE variant, used by Next.js for the SVG favicon.
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

  // Owner preview files (never committed — see .gitignore for tmp/).
  const previewDir = path.join(ROOT, "tmp/favicon-preview");
  await mkdir(previewDir, { recursive: true });

  const large512 = await renderBuffer(Buffer.from(largeSvg), 512);
  const small32 = await renderBuffer(Buffer.from(smallSvg), 32);
  const small16 = await renderBuffer(Buffer.from(smallSvg), 16);
  await writeFile(path.join(previewDir, "large-512.png"), large512);
  await writeFile(path.join(previewDir, "small-32.png"), small32);
  await writeFile(path.join(previewDir, "small-16.png"), small16);

  await buildPreviewSheet(previewDir, largeSvg, smallSvg);

  console.log("Favicons generated.");
  if (usedFallbackFont) {
    console.log(
      "NOTE: primary font (Be Vietnam Pro ExtraBold) could not be downloaded; JetBrains Mono ExtraBold was used as a fallback."
    );
  }
}

async function buildPreviewSheet(previewDir: string, largeSvg: string, smallSvg: string) {
  const sizes = [16, 32, 48, 64, 128, 192, 512];
  const cellSize = 140;
  const padding = 20;
  const labelHeight = 24;
  const rowHeight = cellSize + labelHeight + padding;
  const cols = sizes.length;
  const sheetWidth = cols * cellSize + (cols + 1) * padding;
  const rowsBg = ["#FFFFFF", "#E8E8EA"]; // white, then light-grey "tab bar"
  const sheetHeight = rowsBg.length * rowHeight + padding;

  const cells: { size: number; svg: string; png: Buffer }[] = [];
  for (const size of sizes) {
    const svg = size <= 32 ? smallSvg : largeSvg;
    const png = await renderBuffer(Buffer.from(svg), Math.min(size, cellSize - 20));
    cells.push({ size, svg, png });
  }

  const composites: OverlayOptions[] = [];
  const rectSvgs: Buffer[] = [];

  for (let row = 0; row < rowsBg.length; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = cells[col];
      const x = padding + col * (cellSize + padding);
      const y = padding + row * rowHeight;
      const iconSize = cell.png ? undefined : undefined;
      composites.push({
        input: cell.png,
        left: Math.round(x + (cellSize - (await sharp(cell.png).metadata()).width!) / 2),
        top: Math.round(y + (cellSize - (await sharp(cell.png).metadata()).height!) / 2),
      });
    }
  }

  const base = sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: "#FFFFFF",
    },
  });

  // Draw row background bands first, then icons, then labels via SVG text overlay.
  const bandsSvg = rowsBg
    .map(
      (color, row) =>
        `<rect x="0" y="${row * rowHeight}" width="${sheetWidth}" height="${rowHeight}" fill="${color}"/>`
    )
    .join("");
  const labelsSvg = rowsBg
    .map((_, row) =>
      sizes
        .map((size, col) => {
          const x = padding + col * (cellSize + padding) + cellSize / 2;
          const y = row * rowHeight + cellSize + padding + 16;
          return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="14" fill="#333333" text-anchor="middle">${size}px</text>`;
        })
        .join("")
    )
    .join("");
  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${sheetHeight}">${bandsSvg}${labelsSvg}</svg>`;

  const finalComposite: OverlayOptions[] = [
    { input: Buffer.from(overlaySvg), left: 0, top: 0 },
    ...composites,
  ];

  const sheet = await base.composite(finalComposite).png().toBuffer();
  await writeFile(path.join(previewDir, "sheet.png"), sheet);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
