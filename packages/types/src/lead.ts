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
  | { kind: "interview"; offerText: string }
  | { kind: "job_search"; appellationCode: string; department: string }
  | { kind: "company"; siren: string };

/**
 * Stands for "the application just created" in the interview setup's
 * `?candidature=`, since its id does not exist yet when the link is built.
 */
export const LATEST_APPLICATION = "recente";

/** Same cap as the offer pasted into the public ATS scan. */
export const LEAD_OFFER_TEXT_MAX = 8000;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** ROME 4.0 appellation codes are numbers, 5 or 6 digits today. */
const APPELLATION_CODE = /^\d{1,8}$/;
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
    case "offer":
    case "interview": {
      const offerText = text(value.offerText);

      return offerText && offerText.length <= LEAD_OFFER_TEXT_MAX
        ? { kind: value.kind, offerText }
        : null;
    }
    case "job_search": {
      const appellationCode = text(value.appellationCode);
      const department = text(value.department).toUpperCase();

      return APPELLATION_CODE.test(appellationCode) &&
        DEPARTMENT.test(department)
        ? { appellationCode, department, kind: "job_search" }
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
    // The application is created on redemption as well: the setup screen
    // resolves "recente" to the newest one, which is it (US-141).
    case "interview":
      return `/entretiens/new?candidature=${LATEST_APPLICATION}`;
    // The search is written on redemption too; its tab shows the job and the
    // department the visitor picked (US-137).
    case "job_search":
      return "/ma-recherche";
    // The visitor checked one employer and asked for the others that hire in
    // their job: the list, which says what its search still lacks (US-139).
    case "company":
      return "/entreprises";
    default:
      return null;
  }
}
