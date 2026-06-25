/**
 * FlexPay API v1.4 (docs/docs.txt)
 * transaction.status : 0 = succès, 1 = échec ou intermédiaire (souvent avant confirmation USSD).
 * Ne jamais conclure à un échec sur un seul statut 1 — le débit peut être en cours.
 */
export const FLEXPAY_MOBILE_POLL_INTERVAL_MS = 4_000;
export const FLEXPAY_MOBILE_MAX_WAIT_MS = 180_000;
export const FLEXPAY_MOBILE_FIRST_POLL_DELAY_MS = 4_000;
export const FLEXPAY_CANCEL_BUTTON_DELAY_MS = 20_000;
export const FLEXPAY_CONFIRMATION_POLL_MAX_MS = 300_000;

export type FlexPayCheckState = "pending" | "success" | "failed" | "cancelled";
