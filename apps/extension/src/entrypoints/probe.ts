import type { PageSignals } from "../domain/badge";
import { findApplyLink, formFieldCount } from "../page/apply-link";

/**
 * Injected after each page load when the candidate allowed page access
 * (US-207): counts the form's fields and finds the « Postuler » link for the
 * icon's badge. Reads no value, sends nothing anywhere.
 */
export default defineUnlistedScript(
  (): PageSignals => ({
    applyLink: findApplyLink(),
    fieldCount: formFieldCount(),
    fileInput: document.querySelector('input[type="file"]') !== null,
  }),
);
