// Reads the downloaded open-data files from tmp/opendata/ (not committed). Shared by the importers.
import { createReadStream } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { parseCsv, type SourceKey } from "./opendata";

export const SOURCE_FILES: Record<SourceKey, string> = {
  hcm: "hcmc/DanhSachDangHoatDong.csv",
  sonla: "sonla/DuLieuDN.xls",
  quangngai: "quangngai/danh-sach-doanh-nghiep.xls",
};

/** Header + data rows as raw cells. The whitelist mapper in runImport picks the allowed columns. */
export async function openSourceRows(source: SourceKey): Promise<{ header: string[]; rows: AsyncIterable<unknown[]> | Iterable<unknown[]> }> {
  const path = join(process.cwd(), "tmp", "opendata", SOURCE_FILES[source]);
  if (source === "hcm") {
    const it = parseCsv(createReadStream(path, { encoding: "utf8" }))[Symbol.asyncIterator]();
    const first = await it.next();
    const header = (first.value ?? []).map((h: string) => h.replace(/^﻿/, ""));
    return { header, rows: { [Symbol.asyncIterator]: () => it } };
  }
  const wb = XLSX.readFile(path);
  const all = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
  const [header, ...rows] = all;
  return { header: (header ?? []).map((h) => String(h ?? "")), rows: rows.filter((r) => r.some((c) => c !== null)) };
}

