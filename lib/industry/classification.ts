// Which industry classification the stored codes belong to. Sources do not declare it, so this is a measured finding
// (see data/vsic/catalog-classification.json, `npm run data:vsic-classify`): every source contains codes that exist only
// in the 2018 system and none that exist only in the 2025 system. Codes are shown exactly as the source published them;
// nothing is remapped to Quyết định 36/2025/QĐ-TTg because no official one-to-one mapping exists for split/merged codes.
export type ClassificationVersion = "VSIC_2018" | "VSIC_2025" | "UNKNOWN";

export const STORED_CODES_VERSION: ClassificationVersion = "VSIC_2018";

export const CLASSIFICATION_LABEL = "Hệ thống ngành kinh tế 2018 (Quyết định 27/2018/QĐ-TTg, đã hết hiệu lực từ 15/11/2025)";

/** Short user-facing note for pages that show industry codes. */
export const CLASSIFICATION_NOTE =
  "Mã ngành trong dữ liệu này theo Hệ thống ngành kinh tế 2018 (Quyết định 27/2018/QĐ-TTg) như nguồn công bố. Hệ thống hiện hành từ 15/11/2025 là Quyết định 36/2025/QĐ-TTg và có mã, tên ngành khác; chúng tôi chưa chuyển đổi mã sang hệ mới.";
