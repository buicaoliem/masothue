import contentJson from "@/data/vsic/vsic2025-content.json";
import { allVsic2025, childrenOf, isVsic2025PageIndexable, type Vsic2025Content } from "./catalog";
import type { VsicEntry } from "./types";

const CONTENT = contentJson as Record<string, Vsic2025Content>;

export const getVsic2025Content = (code: string): Vsic2025Content | undefined => CONTENT[code];

export const isEntryIndexable = (e: VsicEntry): boolean => isVsic2025PageIndexable(e, CONTENT[e.code], childrenOf(e.code));

export const listIndexableVsic2025 = (): VsicEntry[] => allVsic2025().filter(isEntryIndexable);
