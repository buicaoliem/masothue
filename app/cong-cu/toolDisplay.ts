// Presentation-only metadata (icon glyph, catalog group) for the tool catalog UI.
// Deliberately kept out of lib/tools/registry.ts, which stays untouched here — this
// file only decorates entries that already exist there.

export const TOOL_ICON: Record<string, string> = {
  "tinh-thue-tncn": "%",
  "tinh-luong": "₫",
  "kiem-tra-ma-so-thue": "✓",
  "tinh-vat": "+",
  "doi-so-thanh-chu": "Aa",
};

export type ToolGroupKey = "thue-luong" | "mst-chung-tu";

export const TOOL_GROUP: Record<string, ToolGroupKey> = {
  "tinh-thue-tncn": "thue-luong",
  "tinh-luong": "thue-luong",
  "tinh-vat": "thue-luong",
  "kiem-tra-ma-so-thue": "mst-chung-tu",
  "doi-so-thanh-chu": "mst-chung-tu",
};

export const TOOL_GROUP_LABEL: Record<ToolGroupKey, string> = {
  "thue-luong": "Thuế và lương",
  "mst-chung-tu": "Mã số thuế và chứng từ",
};
