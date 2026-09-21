// Minimal, dependency-free .docx reader (zip central directory + inflate). Deterministic; used only by the data build scripts.
import { inflateRawSync } from "node:zlib";

export function readZipEntry(buf: Buffer, name: string): Buffer {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip file: end-of-central-directory not found");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Corrupt zip central directory");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const entry = buf.toString("utf8", p + 46, p + 46 + nlen);
    if (entry === name) {
      const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const raw = buf.subarray(dataStart, dataStart + csize);
      if (method === 0) return Buffer.from(raw);
      if (method === 8) return inflateRawSync(raw);
      throw new Error(`Unsupported zip compression method ${method}`);
    }
    p += 46 + nlen + elen + clen;
  }
  throw new Error(`Zip entry not found: ${name}`);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? m;
  });
}
const clean = (s: string) => s.replace(/[ \s]+/g, " ").trim();

function paragraphText(p: string): string {
  let out = "";
  for (const m of p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>/g)) out += m[1] === undefined ? " " : decode(m[1]);
  return clean(out);
}

export function docxXml(buf: Buffer): string {
  return readZipEntry(buf, "word/document.xml").toString("utf8");
}

/** Every table row as an array of cell texts (paragraphs of a cell joined by a space). */
export function docxTableRows(xml: string): string[][] {
  return [...xml.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map((r) =>
    [...r[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((c) => clean([...c[0].matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((p) => paragraphText(p[0])).join(" "))),
  );
}

/** Non-empty body paragraphs, in document order. */
export function docxParagraphs(xml: string): string[] {
  return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((p) => paragraphText(p[0])).filter(Boolean);
}
