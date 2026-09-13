import { BusinessSource, CompanyData, FetchResult, SourceTransportError } from "./types";

const BASE_URL = "https://esgoo.net/api-mst";

// Only the fields we are allowed to use. The phone field (`dt`) is
// intentionally absent and must never be read, stored, or logged.
interface EsgooData {
  ten?: unknown;
  mst?: unknown;
  dc?: unknown;
  daidien?: unknown;
  hoatdong?: unknown;
  tinhtrang?: unknown;
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s === "" || s.toLowerCase() === "null" ? null : s;
}

// esgoo returns "1970-01-01" (epoch 0) when the date is unknown.
function parseActiveDate(v: unknown): Date | null {
  const s = str(v);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s) || s === "1970-01-01") return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export class EsgooSource implements BusinessSource {
  readonly name = "esgoo";

  async fetchByTaxCode(taxCode: string): Promise<FetchResult> {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/${encodeURIComponent(taxCode)}.htm`, {
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      throw new SourceTransportError(`esgoo network error: ${(err as Error).message}`, null);
    }
    if (!res.ok) {
      throw new SourceTransportError(`esgoo HTTP ${res.status}`, res.status);
    }

    let body: { error?: unknown; error_text?: unknown; data?: unknown };
    try {
      body = await res.json();
    } catch {
      throw new SourceTransportError("esgoo returned non-JSON body", res.status);
    }

    if (body.error !== 0) {
      return {
        kind: "SOURCE_MISS",
        source: this.name,
        reason: str(body.error_text) ?? `error=${String(body.error)}`,
      };
    }

    const raw = (body.data ?? {}) as EsgooData;
    const name = str(raw.ten);
    if (!name) {
      return { kind: "SOURCE_MISS", source: this.name, reason: "missing name in response" };
    }

    const data: CompanyData = {
      taxCode,
      name,
      nameForeign: null,
      nameShort: null,
      address: str(raw.dc),
      provinceCode: null,
      province: null,
      district: null,
      ward: null,
      status: str(raw.tinhtrang),
      activeDate: parseActiveDate(raw.hoatdong),
      legalType: null,
      taxOffice: null,
      representativeName: str(raw.daidien),
      // Industries are not taken from esgoo (`nganhnghe` ignored by design).
      mainIndustryCode: null,
      mainIndustry: null,
      capital: null,
    };
    return { kind: "OK", source: this.name, data };
  }
}
