import { APPLICATION_STATUS_DRAFT } from "@cvforge/types";

/**
 * When the extension may click the final button for the candidate (ADR-034
 * §6, US-198), and how it tells a sending went through.
 */

/** Sites whose terms forbid automation: read-only for the extension (US-210). */
const BLOCKED_SITES: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$/i, "LinkedIn"],
  [/(^|\.)indeed\.[a-z.]+$/i, "Indeed"],
];

/**
 * The site's name when its terms forbid automation (US-210): no script, no
 * click, no fill there; the extension only imports the offer by its address.
 */
export function readOnlySite(url: string): string | null {
  try {
    const host = new URL(url).host;
    return BLOCKED_SITES.find(([site]) => site.test(host))?.[1] ?? null;
  } catch {
    return null;
  }
}

const SECOND_LEVEL = new Set(["co", "com", "org", "net", "gov", "ac", "gouv"]);

/** `jobs.lever.co` → `lever.co`, `careers.acme.co.uk` → `acme.co.uk`. */
export function siteOf(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".");
  const take =
    labels.length > 2 &&
    labels.at(-1)!.length === 2 &&
    SECOND_LEVEL.has(labels.at(-2)!)
      ? 3
      : 2;
  return labels.slice(-take).join(".");
}

export type SubmitCheck = {
  pageUrl: string;
  offerUrl: string | null;
  status: string;
  requiredEmpty: string[];
};

/** Why the extension must not send, or null when it may. */
export function submitRefusal(check: SubmitCheck): string | null {
  const page = new URL(check.pageUrl);
  if (readOnlySite(page.href)) {
    return "Ce site interdit l'envoi automatique : envoyez la candidature vous-même.";
  }
  if (check.status !== APPLICATION_STATUS_DRAFT) {
    return "Cette candidature a déjà été envoyée.";
  }
  if (check.offerUrl) {
    const offerHost = new URL(check.offerUrl).host;
    if (siteOf(offerHost) !== siteOf(page.host)) {
      return `Ce formulaire n'est pas sur le site de l'offre (${siteOf(offerHost)}) : envoyez-le vous-même après vérification.`;
    }
  }
  if (check.requiredEmpty.length > 0) {
    return `Champs obligatoires encore vides : ${check.requiredEmpty.join(", ")}.`;
  }
  return null;
}

const CONFIRMATION_TEXT = [
  /merci (pour|de) votre candidature/i,
  /votre candidature (a bien été|a été|est) (envoyée|reçue|transmise|enregistrée)/i,
  /candidature (bien )?(envoyée|reçue|transmise)/i,
  /nous avons (bien )?reçu votre candidature/i,
  /thank(s| you) for (your )?(applying|application|interest|submitting)/i,
  /(your )?application (has been |was )?(submitted|received|sent)/i,
  /we('ve| have) received your application/i,
  /bewerbung (wurde|ist) (erfolgreich )?(eingegangen|gesendet|übermittelt)/i,
];
const CONFIRMATION_PATH =
  /(thank|thanks|merci|confirmation|confirm|success|submitted|complete)/i;

/**
 * The page shown after the click says the application went through. A
 * sentence already on the form page before the click (« Thank you for your
 * interest… » in an offer's intro) proves nothing.
 */
export function looksConfirmed(
  page: { url: string; text: string },
  before: { url: string; text: string },
): boolean {
  if (
    CONFIRMATION_TEXT.some(
      (pattern) => pattern.test(page.text) && !pattern.test(before.text),
    )
  ) {
    return true;
  }
  const after = new URL(page.url).pathname;
  return (
    after !== new URL(before.url).pathname && CONFIRMATION_PATH.test(after)
  );
}
