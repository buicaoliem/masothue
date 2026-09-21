import { evaluateIndustrySeoQuality, evaluateProvinceIndustrySeoQuality } from "@/lib/seo/industry-quality";
import {
  getIndustryContext,
  listIndustryStats,
  listProvinceIndustryStats,
  type IndustryStatRow,
  type ProvinceIndustryStatRow,
} from "./service";

// Selection of indexable industry pages. Sitemaps, homepage, hub links and metadata all go through the
// quality evaluator (lib/seo/industry-quality.ts); nothing here compares raw counts.

/** Indexable industry hubs, deterministic order (code). */
export async function listIndexableIndustries(): Promise<IndustryStatRow[]> {
  const [all, ctx] = await Promise.all([listIndustryStats(), getIndustryContext()]);
  return all.filter((s) => evaluateIndustrySeoQuality(s, ctx).indexable).sort((a, b) => a.code.localeCompare(b.code));
}

/** Same list ordered for display: largest first. */
export async function topIndexableIndustries(limit: number): Promise<IndustryStatRow[]> {
  const list = await listIndexableIndustries();
  return list.sort((a, b) => b.companyCount - a.companyCount || a.code.localeCompare(b.code)).slice(0, limit);
}

/** Indexable province x industry landing pages, deterministic order (province, code). */
export async function listIndexableProvinceIndustries(provinceSlug?: string): Promise<ProvinceIndustryStatRow[]> {
  const all = await listProvinceIndustryStats(provinceSlug);
  return all
    .filter((s) => evaluateProvinceIndustrySeoQuality(s).indexable)
    .sort((a, b) => a.provinceSlug.localeCompare(b.provinceSlug) || a.code.localeCompare(b.code));
}
