"use server";

import { getVsic2025, vsic2025Path } from "@/lib/vsic/catalog";
import { convertCode, normalizeCodeInput, searchConversionNames, type ConversionResult } from "@/lib/vsic/convert";
import type { VsicMapping, VsicVersion } from "@/lib/vsic/types";

export type ConvertPair = Pick<VsicMapping, "fromCode" | "toCode" | "toName" | "relationship" | "flagged"> & { href?: string };
export type ConvertResponse =
  | { kind: "empty" }
  | { kind: "invalid"; message: string }
  | { kind: "not_found"; code: string; from: VsicVersion }
  | { kind: "choices"; from: VsicVersion; hits: { code: string; name: string; level: number }[] }
  | {
      kind: "result";
      from: VsicVersion;
      to: VsicVersion;
      code: string;
      name: string;
      level: number;
      targets: ConvertPair[];
      viaParent?: { code: string; name?: string; targets: ConvertPair[] };
      peers: { code: string; name?: string }[];
      needsReview: boolean;
      notes: string[];
    };

const pair = (m: VsicMapping): ConvertPair => {
  const e = m.toVersion === "2025" ? getVsic2025(m.toCode) : undefined;
  return { fromCode: m.fromCode, toCode: m.toCode, toName: m.toName, relationship: m.relationship, flagged: m.flagged, ...(e ? { href: vsic2025Path(e) } : {}) };
};

export async function convertAction(from: VsicVersion, raw: string): Promise<ConvertResponse> {
  const input = String(raw ?? "").trim().slice(0, 120);
  if (!input) return { kind: "empty" };
  if (from !== "2018" && from !== "2025") return { kind: "invalid", message: "Chiều chuyển đổi không hợp lệ." };
  if (/^[A-Za-z]$|^[\d\s.\-_]+$/.test(input)) {
    const r: ConversionResult = convertCode(from, normalizeCodeInput(input));
    if (r.status === "invalid") return { kind: "invalid", message: r.message };
    if (r.status === "not_found") return { kind: "not_found", code: r.code, from };
    return {
      kind: "result",
      from: r.from,
      to: r.to,
      code: r.code,
      name: r.name,
      level: r.level,
      targets: r.targets.map(pair),
      ...(r.viaParent ? { viaParent: { code: r.viaParent.code, name: r.viaParent.name, targets: r.viaParent.targets.map(pair) } } : {}),
      peers: r.peers,
      needsReview: r.needsReview,
      notes: r.reviewNotes,
    };
  }
  return { kind: "choices", from, hits: searchConversionNames(from, input, 20) };
}
