import { BusinessSource, CompanyData, FetchResult, SourceTransportError } from "./types";

const BASE_URL = "https://api.vietqr.io/v2/business";

// Only the fields we use. vietqr returns no phone/email/personal IDs here.
interface VietqrData {
  name?: unknown;
  internationalName?: unknown;
  shortName?: unknown;
  address?: unknown;
  status?: unknown;
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s === "" || s.toLowerCase() === "null" ? null : s;
}

export class VietqrSource implements BusinessSource {
  readonly name = "vietqr";

  /** Seconds from the last 429 `Retry-After` header, for the caller to honor. */
  lastRetryAfter: number | null = null;

  async fetchByTaxCode(taxCode: string): Promise<FetchResult> {
    this.lastRetryAfter = null;
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/${encodeURIComponent(taxCode)}`, {
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      throw new SourceTransportError(`vietqr network error: ${(err as Error).message}`, null);
    }
    if (!res.ok) {
      const ra = Number(res.headers.get("retry-after"));
      this.lastRetryAfter = Number.isFinite(ra) && ra > 0 ? ra : null;
      throw new SourceTransportError(`vietqr HTTP ${res.status}`, res.status);
    }

    let body: { code?: unknown; desc?: unknown; data?: unknown };
    try {
      body = await res.json();
    } catch {
      throw new SourceTransportError("vietqr returned non-JSON body", res.status);
    }

    if (body.code !== "00" || !body.data) {
      return {
        kind: "SOURCE_MISS",
        source: this.name,
        reason: str(body.desc) ?? `code=${String(body.code)}`,
      };
    }

    const raw = body.data as VietqrData;
    const name = str(raw.name);
    if (!name) {
      return { kind: "SOURCE_MISS", source: this.name, reason: "missing name in response" };
    }

    const data: CompanyData = {
      taxCode,
      name,
      nameForeign: str(raw.internationalName),
      nameShort: str(raw.shortName),
      address: str(raw.address),
      province: null,
      district: null,
      ward: null,
      status: str(raw.status),
      activeDate: null,
      legalType: null,
      taxOffice: null,
      representativeName: null,
      mainIndustryCode: null,
      mainIndustry: null,
      capital: null,
    };
    return { kind: "OK", source: this.name, data };
  }
}
