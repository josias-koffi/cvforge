/**
 * The ROME 4.0 jobs a search project is attached to (ADR-024, US-118).
 *
 * ROMEO suggests them from the candidate's own words; only the ones the
 * candidate confirmed drive anything. A retired suggestion is never shown
 * again, so it is not part of what the web receives.
 */

export const searchProjectRomeStatuses = ["suggested", "confirmed"] as const;
export type SearchProjectRomeStatus = (typeof searchProjectRomeStatuses)[number];

/** A ROME appellation: the precise job title, under its broader métier. */
export interface RomeAppellationOption {
  code: string;
  libelle: string;
  metierCode: string;
  metierLibelle: string;
}

export interface SearchProjectRomeAppellation extends RomeAppellationOption {
  status: SearchProjectRomeStatus;
  /** ROMEO's confidence, 0 to 1; `null` for one the candidate added. */
  score: number | null;
}

/** The attribution the licence asks for wherever ROME data is shown. */
export const ROME_SOURCE_LABEL = "Source : ROME 4.0, France Travail";
