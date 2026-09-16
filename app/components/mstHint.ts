import { validateMst } from "@/lib/tools/mst";

export type MstHintState = "empty" | "name" | "short" | "short13" | "long" | "ok" | "bad";

export type MstHint = { digits: string; state: MstHintState; branch: boolean; need?: number };

/**
 * Live typing feedback for an MST input: how many digit boxes to show and what state
 * they're in. The actual check-digit verdict ("ok"/"bad") always comes from validateMst,
 * never re-derived here — this only tracks digit count while the user is still typing.
 */
export function mstHint(raw: string): MstHint {
  const digits = (raw.match(/\d/g) ?? []).join("");
  if (!raw.trim()) return { digits: "", state: "empty", branch: false };
  if (!/^[\d\s.-]*$/.test(raw)) return { digits, state: "name", branch: false };
  if (digits.length < 10) return { digits, state: "short", branch: false, need: 10 - digits.length };
  if (digits.length > 10 && digits.length < 13) {
    return { digits, state: "short13", branch: true, need: 13 - digits.length };
  }
  if (digits.length > 13) return { digits, state: "long", branch: digits.length > 10 };

  const branch = digits.length === 13;
  const normalized = branch ? `${digits.slice(0, 10)}-${digits.slice(10)}` : digits;
  const result = validateMst(normalized);
  return { digits, state: result.valid ? "ok" : "bad", branch };
}
