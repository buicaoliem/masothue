export type LeadFieldErrors = Record<string, string>;
export type LeadFormState = { ok: boolean; submitted: boolean; message?: string; errors: LeadFieldErrors };

export const INITIAL_LEAD_STATE: LeadFormState = { ok: false, submitted: false, errors: {} };
