// Bulk fill of EXISTING Company rows from provincial open-data business registries.
// Privacy: each source maps a fixed WHITELIST of columns (see SOURCES). Every other column in the files
// (ID numbers, dates of birth, phone, email, owners, capital, employees…) is dropped in makeMapper() and never
// stored or logged. Rows are never created; only null columns are filled; hidden rows and tax codes with
// any RemovalRequest are skipped.
import { validateMst } from "@/lib/tools/mst";
import type { Sql } from "@/lib/directory/sql";
import { PROVINCES } from "./province";

export type SourceKey = "hcm" | "sonla" | "quangngai";

/** Whitelisted fields only. */
export interface OpendataRecord {
  taxCode: string;
  name: string | null;
  address: string | null;
  status: string | null;
  representativeName: string | null;
  activeDate: string | null; // YYYY-MM-DD
  mainIndustry: string | null; // "4661 - Bán buôn nhiên liệu…"
  legalType: string | null; // "Loại hình DN"
}

type Field = Exclude<keyof OpendataRecord, "taxCode">;
export const FILL_FIELDS: readonly Field[] = ["name", "address", "status", "representativeName", "activeDate", "mainIndustry", "legalType"];

interface SourceConfig {
  dataSource: string;
  provinceSlug: string;
  /** "Last updated" date shown on the dataset page (see link per source). */
  dataAsOf: string;
  /** Header name in the file → whitelisted field. "taxCode" is required. */
  columns: Record<string, keyof OpendataRecord>;
  /** Value used when the file has no status column (the HCMC file lists active companies only). */
  fixedStatus?: string;
}

export const SOURCES: Record<SourceKey, SourceConfig> = {
  // https://opendata.hochiminhcity.gov.vn/dataset/danh-s%C3%A1ch-c%C3%A1c-doanh-nghi%E1%BB%87p-hi%E1%BB%87n-nay
  // Resource "Doanh nghiệp đang hoạt động" (DanhSachDangHoatDong.csv), updated 14/11/2025.
  // NganhNghe lists every industry without marking the main one (the first entry is often unrelated), so it is not read.
  hcm: {
    dataSource: "opendata-hcm",
    provinceSlug: "ho-chi-minh",
    dataAsOf: "2025-11-14",
    columns: { MaSoDN: "taxCode", TenDN: "name", NgayCap: "activeDate", LoaiDN: "legalType", DiaChi: "address" },
    fixedStatus: "NNT đang hoạt động",
  },
  // https://data.sonla.gov.vn/iframe/detail_data/du-lieu-ve-dang-ky-doanh-nghiep ("Dữ liệu DN .XLS"), updated 25/11/2024.
  sonla: {
    dataSource: "opendata-sonla",
    provinceSlug: "son-la",
    dataAsOf: "2024-11-25",
    columns: {
      "Mã số doanh nghiệp": "taxCode",
      "Tên doanh nghiệp": "name",
      "Địa chỉ": "address",
      "Trạng thái": "status",
      "Người đại diện theo pháp luật": "representativeName",
      "Ngành nghề KD chính": "mainIndustry",
      "Ngày cấp": "activeDate",
      "Loại hình DN": "legalType",
    },
  },
  // https://opendata.quangngai.gov.vn/dataset/danh-sach-cac-doanh-nghi-p-da-dang-ky-tren-d-a-ban-t-nh, updated 27/03/2025.
  quangngai: {
    dataSource: "opendata-quangngai",
    provinceSlug: "quang-ngai",
    dataAsOf: "2025-03-27",
    columns: {
      "Mã số doanh nghiệp": "taxCode",
      "Tên doanh nghiệp": "name",
      "Địa chỉ trụ sở chính": "address",
      "Trạng thái": "status",
      "Người đại diện theo pháp luật": "representativeName",
      "Ngành nghề KD chính": "mainIndustry",
      "Ngày cấp": "activeDate",
      "Loại hình DN": "legalType",
    },
  },
};

// Registry statuses → the tax-authority status strings already stored in Company.status. Anything else → null.
const STATUS_MAP: Record<string, string> = {
  "đang hoạt động": "NNT đang hoạt động",
  "tạm ngừng kinh doanh": "NNT tạm ngừng KD có thời hạn",
  "không còn hoạt động kinh doanh tại địa chỉ đã đăng ký": "NNT không hoạt động tại địa chỉ đã đăng ký",
  "đang làm thủ tục giải thể, đã bị chia, bị hợp nhất, bị sáp nhập": "NNT ngừng HĐ nhưng chưa hoàn thành thủ tục chấm dứt hiệu lực MST",
  "đã giải thể, phá sản, chấm dứt tồn tại": "NNT ngừng hoạt động và đã hoàn thành thủ tục chấm dứt hiệu lực MST",
};

export function normalizeStatus(raw: string | null): string | null {
  if (!raw) return null;
  return STATUS_MAP[raw.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ")] ?? null;
}

function text(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).normalize("NFC").replace(/\s+/g, " ").trim();
  return s === "" ? null : s;
}

/** "dd/mm/yyyy" or an Excel serial day number → "YYYY-MM-DD". */
export function parseDate(v: unknown): string | null {
  if (typeof v === "number" && v > 0) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000);
    return d.toISOString().slice(0, 10);
  }
  const s = text(v);
  const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/** First industry entry only: "1621: Tên ngành-(chi tiết);1622: …" or "4661:Tên ngành" → "1621 - Tên ngành". */
export function parseMainIndustry(v: unknown): string | null {
  const first = text(v)?.split(";")[0];
  const m = first?.match(/^(\d{4,5})\s*:\s*(.+)$/);
  if (!m) return null;
  const name = m[2].split(/\s*-+\s*(?:\(|Chi tiết)/i)[0].replace(/[\s-]+$/, "").trim();
  return name ? `${m[1]} - ${name}` : null;
}

/** Builds the whitelist mapper for a file header. Throws when a mapped column is missing. */
export function makeMapper(source: SourceKey, header: readonly string[]) {
  const cfg = SOURCES[source];
  const idx = new Map<keyof OpendataRecord, number>();
  for (const [col, field] of Object.entries(cfg.columns)) {
    const i = header.findIndex((h) => text(h) === col);
    if (i < 0) throw new Error(`${source}: missing column "${col}"`);
    idx.set(field, i);
  }
  const cell = (cells: readonly unknown[], f: keyof OpendataRecord) => (idx.has(f) ? cells[idx.get(f)!] : null);

  return (cells: readonly unknown[]): OpendataRecord | null => {
    const mst = validateMst(text(cell(cells, "taxCode")) ?? "");
    if (!mst.valid) return null;
    return {
      taxCode: mst.normalized,
      name: text(cell(cells, "name")),
      address: text(cell(cells, "address")),
      status: cfg.fixedStatus ?? normalizeStatus(text(cell(cells, "status"))),
      representativeName: text(cell(cells, "representativeName")),
      activeDate: parseDate(cell(cells, "activeDate")),
      mainIndustry: parseMainIndustry(cell(cells, "mainIndustry")),
      legalType: text(cell(cells, "legalType")),
    };
  };
}

/** Minimal streaming CSV parser (RFC 4180 quotes, embedded newlines). */
export async function* parseCsv(chunks: AsyncIterable<string>): AsyncGenerator<string[]> {
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let pendingQuote = false; // saw a quote inside a quoted field; next char decides
  for await (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      if (pendingQuote) {
        pendingQuote = false;
        if (ch === '"') {
          field += '"';
          continue;
        }
        quoted = false;
      }
      if (quoted) {
        if (ch === '"') pendingQuote = true;
        else field += ch;
      } else if (ch === '"' && field === "") quoted = true;
      else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field.replace(/\r$/, ""));
        yield row;
        row = [];
        field = "";
      } else field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    yield row;
  }
}

export interface ImportStats {
  read: number;
  invalidMst: number;
  duplicate: number;
  notInDb: number;
  hidden: number;
  removal: number;
  nothingToFill: number;
  updatedRows: number;
  becomeOk: number;
  fill: Record<Field | "provinceSlug", number>;
}

export function emptyStats(): ImportStats {
  return {
    read: 0, invalidMst: 0, duplicate: 0, notInDb: 0, hidden: 0, removal: 0, nothingToFill: 0, updatedRows: 0, becomeOk: 0,
    fill: { name: 0, address: 0, status: 0, representativeName: 0, activeDate: 0, mainIndustry: 0, legalType: 0, provinceSlug: 0 },
  };
}

type ExistingRow = {
  taxCode: string;
  name: string | null;
  address: string | null;
  status: string | null;
  representativeName: string | null;
  activeDate: unknown;
  mainIndustry: string | null;
  legalType: string | null;
  provinceSlug: string | null;
  enrichStatus: string;
  isHidden: boolean;
  removal: boolean;
};

export const BATCH_SIZE = 500;
const checkpointScope = (source: SourceKey) => `opendata-${source}`;

export async function readCheckpoint(sql: Sql, source: SourceKey): Promise<number | null> {
  const rows = await sql.query<{ cursor: string | null }>(`SELECT cursor FROM "IngestCheckpoint" WHERE scope = $1`, [checkpointScope(source)]);
  const n = Number(rows[0]?.cursor);
  return rows[0]?.cursor != null && Number.isInteger(n) ? n : null;
}

/**
 * Process one batch of records (already whitelisted). Dry run (apply=false) only reads.
 * With apply=true, the update and the checkpoint (`nextRow`) are written in one transaction.
 */
export async function processBatch(
  sql: Sql,
  source: SourceKey,
  records: readonly (OpendataRecord | null)[],
  opts: { apply: boolean; nextRow: number; done: boolean; seen: Set<string>; stats: ImportStats },
): Promise<void> {
  const cfg = SOURCES[source];
  const province = PROVINCES.find((p) => p.slug === cfg.provinceSlug)!;
  const { stats, seen } = opts;
  const unique: OpendataRecord[] = [];
  for (const r of records) {
    stats.read++;
    if (!r) stats.invalidMst++;
    else if (seen.has(r.taxCode)) stats.duplicate++;
    else {
      seen.add(r.taxCode);
      unique.push(r);
    }
  }

  const work = async (tx: Sql) => {
    const existing = unique.length
      ? await tx.query<ExistingRow>(
          `SELECT c."taxCode", c.name, c.address, c.status, c."representativeName", c."activeDate", c."mainIndustry",
                  c."legalType", c."provinceSlug", c."enrichStatus"::text AS "enrichStatus", c."isHidden",
                  EXISTS (SELECT 1 FROM "RemovalRequest" r WHERE r."taxCode" = c."taxCode") AS removal
           FROM "Company" c WHERE c."taxCode" = ANY($1::text[])`,
          [unique.map((r) => r.taxCode)],
        )
      : [];
    const byTax = new Map(existing.map((e) => [e.taxCode, e]));
    const updates: OpendataRecord[] = [];
    for (const r of unique) {
      const e = byTax.get(r.taxCode);
      if (!e) stats.notInDb++;
      else if (e.isHidden) stats.hidden++;
      else if (e.removal) stats.removal++;
      else {
        const filled = FILL_FIELDS.filter((f) => r[f] !== null && (e[f] === null || e[f] === undefined));
        const fillsProvince = e.provinceSlug === null;
        if (filled.length === 0) {
          stats.nothingToFill++;
          continue;
        }
        for (const f of filled) stats.fill[f]++;
        if (fillsProvince) stats.fill.provinceSlug++;
        if (e.enrichStatus !== "OK" && (e.name ?? r.name) !== null && (e.address ?? r.address) !== null) stats.becomeOk++;
        stats.updatedRows++;
        updates.push(r);
      }
    }
    if (!opts.apply) return;

    if (updates.length) {
      const col = (f: Field) => updates.map((u) => u[f]);
      // COALESCE keeps every existing value; the WHERE re-checks hidden/removal inside the transaction.
      await tx.query(
        `UPDATE "Company" c SET
           name = COALESCE(c.name, v.name),
           address = COALESCE(c.address, v.address),
           status = COALESCE(c.status, v.status),
           "representativeName" = COALESCE(c."representativeName", v.rep),
           "activeDate" = COALESCE(c."activeDate", v.active::date),
           "mainIndustry" = COALESCE(c."mainIndustry", v.industry),
           "legalType" = COALESCE(c."legalType", v.legal),
           province = CASE WHEN c."provinceSlug" IS NULL THEN COALESCE(c.province, $9) ELSE c.province END,
           "provinceSlug" = COALESCE(c."provinceSlug", $10),
           "dataSource" = COALESCE(c."dataSource", $11),
           "dataAsOf" = CASE WHEN c."dataSource" IS NULL THEN $12::date ELSE c."dataAsOf" END,
           "enrichStatus" = CASE
             WHEN COALESCE(c.name, v.name) IS NOT NULL AND COALESCE(c.address, v.address) IS NOT NULL THEN 'OK'::"EnrichStatus"
             ELSE c."enrichStatus" END,
           "updatedAt" = now()
         FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[])
           AS v(tax, name, address, status, rep, active, industry, legal)
         WHERE c."taxCode" = v.tax AND c."isHidden" = false
           AND NOT EXISTS (SELECT 1 FROM "RemovalRequest" r WHERE r."taxCode" = c."taxCode")
         RETURNING c."taxCode"`,
        [
          updates.map((u) => u.taxCode), col("name"), col("address"), col("status"), col("representativeName"),
          col("activeDate"), col("mainIndustry"), col("legalType"),
          province.displayName, province.slug, cfg.dataSource, cfg.dataAsOf,
        ],
      );
    }
    await tx.query(
      `INSERT INTO "IngestCheckpoint" (id, scope, cursor, status, "updatedAt") VALUES ($1, $1, $2, $3, now())
       ON CONFLICT (scope) DO UPDATE SET cursor = EXCLUDED.cursor, status = EXCLUDED.status, "updatedAt" = now()`,
      [checkpointScope(source), String(opts.nextRow), opts.done ? "done" : "running"],
    );
  };

  if (opts.apply) await sql.transaction(work);
  else await work(sql);
}

/**
 * Reads up to `limit` data rows starting at `offset` (or the saved checkpoint, or 0) and processes them
 * in batches. `rows` yields raw cells for data rows in file order, after the header.
 */
export async function runImport(
  sql: Sql,
  source: SourceKey,
  header: readonly string[],
  rows: AsyncIterable<readonly unknown[]> | Iterable<readonly unknown[]>,
  opts: { apply: boolean; limit: number; offset?: number; onBatch?: (stats: ImportStats, nextRow: number) => void },
): Promise<{ stats: ImportStats; start: number; nextRow: number; samples: OpendataRecord[] }> {
  const map = makeMapper(source, header);
  const start = opts.offset ?? (await readCheckpoint(sql, source)) ?? 0;
  const stats = emptyStats();
  const seen = new Set<string>();
  const samples: OpendataRecord[] = [];
  let batch: (OpendataRecord | null)[] = [];
  let rowIndex = 0;
  let exhausted = true;

  const flush = async (done: boolean) => {
    await processBatch(sql, source, batch, { apply: opts.apply, nextRow: rowIndex, done, seen, stats });
    batch = [];
    opts.onBatch?.(stats, rowIndex);
  };

  for await (const cells of rows) {
    if (rowIndex < start) {
      rowIndex++;
      continue;
    }
    if (rowIndex >= start + opts.limit) {
      exhausted = false;
      break;
    }
    const rec = map(cells);
    if (rec && samples.length < 5) samples.push(rec);
    batch.push(rec);
    rowIndex++;
    if (batch.length >= BATCH_SIZE) await flush(false);
  }
  if (batch.length > 0 || (opts.apply && exhausted)) await flush(exhausted);
  return { stats, start, nextRow: rowIndex, samples };
}
