// Public business fields only. Never add phone/email/personal ID fields.
export interface CompanyData {
  taxCode: string;
  name: string;
  nameForeign: string | null;
  nameShort: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  status: string | null;
  activeDate: Date | null;
  legalType: string | null;
  taxOffice: string | null;
  representativeName: string | null;
  mainIndustryCode: string | null;
  mainIndustry: string | null;
  capital: string | null;
}

export type FetchResult =
  | { kind: "OK"; source: string; data: CompanyData }
  // Source has no data for this tax code. The company may still exist.
  | { kind: "SOURCE_MISS"; source: string; reason: string };

export interface BusinessSource {
  readonly name: string;
  /**
   * Returns OK or SOURCE_MISS. Throws only on transport-level failures
   * (network, HTTP 429/5xx, unparseable body) so the caller can retry.
   */
  fetchByTaxCode(taxCode: string): Promise<FetchResult>;
}

export class SourceTransportError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number | null,
  ) {
    super(message);
    this.name = "SourceTransportError";
  }
}
