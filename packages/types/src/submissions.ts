/**
 * Proof of an application sent from the Chrome extension (ADR-034 §7,
 * US-198). A sending without a confirmation page stays a draft, flagged
 * "to check": it is never counted as sent on a guess.
 */
export type SubmissionField = { label: string; value: string };

export type ApplicationSubmission = {
  id: string;
  applicationId: string;
  submittedAt: string;
  formUrl: string;
  confirmationUrl: string | null;
  confirmed: boolean;
  documents: string[];
  fields: SubmissionField[];
  hasScreenshot: boolean;
};

export const SUBMISSION_SCREENSHOT_TYPES = ["image/jpeg", "image/png"] as const;
/** A JPEG of the visible page; the MCP body limit is 1 MiB once in base64. */
export const SUBMISSION_SCREENSHOT_MAX_BYTES = 600 * 1024;
export const SUBMISSION_FIELDS_MAX = 120;
export const SUBMISSION_FIELD_TEXT_MAX = 2_000;
