/**
 * What a visitor of a free tool asked for, carried by their magic link so the
 * app can pick up where the tool left off (US-133).
 *
 * Never CV text: every kind holds an identifier or a job offer, which is what
 * keeps a lead out of the personal-data rules of an anonymous CV (ADR-022).
 */
export type LeadIntent =
  | { kind: "ats_scan"; scanId: string }
  | { kind: "offer"; offerText: string }
  | { kind: "job_search"; romeCode: string; department: string }
  | { kind: "company"; siren: string };

/** Same cap as the offer pasted into the public ATS scan. */
export const LEAD_OFFER_TEXT_MAX = 8000;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROME_CODE = /^[A-N]\d{4}$/;
const DEPARTMENT = /^(\d{2}|2A|2B|97\d)$/;
const SIREN = /^\d{9}$/;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The intent, or null when anything about it is off. Public routes build
 * these from visitor input, so nothing unchecked may reach the database.
 */
export function parseLeadIntent(raw: unknown): LeadIntent | null {
  if (!raw || typeof raw !== "object") return null;

  const value = raw as Record<string, unknown>;

  switch (value.kind) {
    case "ats_scan": {
      const scanId = text(value.scanId);

      return UUID.test(scanId) ? { kind: "ats_scan", scanId } : null;
    }
    case "offer": {
      const offerText = text(value.offerText);

      return offerText && offerText.length <= LEAD_OFFER_TEXT_MAX
        ? { kind: "offer", offerText }
        : null;
    }
    case "job_search": {
      const romeCode = text(value.romeCode).toUpperCase();
      const department = text(value.department).toUpperCase();

      return ROME_CODE.test(romeCode) && DEPARTMENT.test(department)
        ? { department, kind: "job_search", romeCode }
        : null;
    }
    case "company": {
      const siren = text(value.siren);

      return SIREN.test(siren) ? { kind: "company", siren } : null;
    }
    default:
      return null;
  }
}

/**
 * Where the app should open once the link is clicked, or null for the default
 * landing screen. Each tool's story adds its own screen here.
 */
export function leadIntentPath(intent: LeadIntent): string | null {
  switch (intent.kind) {
    case "ats_scan":
      return `/analyses-ats/${intent.scanId}`;
    // The application is created on redemption, after this link was built,
    // so the list is the screen that is sure to show it (US-136).
    case "offer":
      return "/candidatures";
    default:
      return null;
  }
}
