import { isOfferPage, isWebPage } from "./offer";
import { exclusion } from "./queue";

/**
 * The badge on the extension's icon (US-207): on an offer JobSpark knows,
 * its relevance score; on a form « Remplir » can handle, a check mark.
 * Nothing elsewhere. Worked out locally, no credit, no model.
 */

/** What the probe script reads in the page, nothing else. */
export type PageSignals = {
  fieldCount: number;
  /** A file field: application forms ask for the CV. */
  fileInput: boolean;
  /** The same-site « Postuler » / « Apply » link, if any. */
  applyLink: string | null;
};

/** An offer JobSpark proposed to the candidate, as the badge needs it. */
export type KnownOffer = { url: string; score: number | null; title: string };

export type Badge = { text: string; color: string; title: string };

const FORM_MIN_FIELDS = 3;
const BLUE = "#2D5FFF";
const GREEN = "#16A34A";
const AMBER = "#D97706";
const GREY = "#6B7280";

const scoreColor = (score: number) =>
  score >= 70 ? GREEN : score >= 50 ? AMBER : GREY;

/** The JobSpark offer this page shows, or its form, if any. */
export function knownOfferFor(
  offers: readonly KnownOffer[],
  url: string,
): KnownOffer | null {
  return offers.find((offer) => isOfferPage(offer.url, url)) ?? null;
}

/** Whether « Remplir » can work here: an application form, or the way to it. */
export function fillable(signals: PageSignals | null): boolean {
  if (!signals) return false;
  return (
    (signals.fileInput && signals.fieldCount >= FORM_MIN_FIELDS) ||
    signals.applyLink !== null
  );
}

export function badgeFor(
  url: string | undefined,
  signals: PageSignals | null,
  known: KnownOffer | null,
): Badge | null {
  if (!isWebPage(url)) return null;
  // LinkedIn, Indeed…: nothing is filled there (US-210), only the score.
  const canFill = exclusion(url) === null && fillable(signals);
  const score =
    known?.score === null || known?.score === undefined
      ? null
      : Math.round(known.score);

  if (score !== null) {
    return {
      color: scoreColor(score),
      text: String(score),
      title: `JobSpark : pertinence ${score}/100${canFill ? " — JobSpark peut remplir ce formulaire" : ""}`,
    };
  }
  if (!canFill) return null;
  return {
    color: BLUE,
    text: "✓",
    title: known
      ? `JobSpark peut remplir la candidature « ${known.title} »`
      : "JobSpark peut remplir ce formulaire",
  };
}
