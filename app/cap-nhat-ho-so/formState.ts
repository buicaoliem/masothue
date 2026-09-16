export type ProfileFieldErrors = Record<string, string>;
export type ProfileFormState = { ok: boolean; submitted: boolean; message?: string; errors: ProfileFieldErrors };

export const INITIAL_PROFILE_STATE: ProfileFormState = { ok: false, submitted: false, errors: {} };
