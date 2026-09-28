// Analytics IDs for masothuedn.com. These are the ONLY correct IDs for this domain —
// never swap with another property/domain's IDs.
export const GTM_CONTAINER_ID = "GTM-KCXDN3XN";
export const GA4_MEASUREMENT_ID = "G-RST9V4P8F1";
export const CLARITY_PROJECT_ID = "yp73pnmmpn";

// Only load trackers in real production. Prefers Vercel's own env var (distinguishes
// production deploys from preview/branch deploys, both of which are NODE_ENV=production
// in a Vercel build); falls back to NODE_ENV for non-Vercel environments (e.g. local
// `next build && next start`).
export const isProductionEnv =
  typeof process.env.VERCEL_ENV !== "undefined"
    ? process.env.VERCEL_ENV === "production"
    : process.env.NODE_ENV === "production";
