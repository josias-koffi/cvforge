/**
 * The "Nouvelle offre pour vous" alerts (E27): their preferences (US-166)
 * and their paid AI analysis (US-168).
 */

/** "close": only the offers very close to the search; "all": every match (US-166). */
export const jobAlertThresholds = ["close", "all"] as const;
export type JobAlertThreshold = (typeof jobAlertThresholds)[number];

/** One e-mail per new offer, or one grouped e-mail an hour at most. */
export const jobAlertRhythms = ["immediate", "hourly"] as const;
export type JobAlertRhythm = (typeof jobAlertRhythms)[number];

/** The "Nouvelle offre pour vous" alerts (E27, US-166). Free for everyone. */
export interface JobAlertPreferences {
  enabled: boolean;
  threshold: JobAlertThreshold;
  rhythm: JobAlertRhythm;
  /** The paid AI analysis of each alert (US-168): 1 credit a day it runs. */
  aiAnalysis: boolean;
  /**
   * With the analysis, an offer judged "à passer" is not sent at once; it
   * stays in the app with its analysis. The candidate's choice: off, they get
   * every free alert, like anyone without the option.
   */
  aiFilter: boolean;
}

/** On by default, decided by the owner on 2026-10-02; the paid analysis off. */
export const DEFAULT_JOB_ALERT_PREFERENCES: JobAlertPreferences = {
  aiAnalysis: false,
  aiFilter: true,
  enabled: true,
  rhythm: "immediate",
  threshold: "close",
};

/** The AI's verdict on one alert: "à saisir", "à considérer", "à passer". */
export const jobAlertVerdicts = ["seize", "consider", "skip"] as const;
export type JobAlertVerdict = (typeof jobAlertVerdicts)[number];

export const JOB_ALERT_VERDICT_LABELS: Record<JobAlertVerdict, string> = {
  consider: "À considérer",
  seize: "À saisir",
  skip: "À passer",
};

/**
 * What the paid analysis says about one offer (US-168). Shown beside the
 * offer, never in its place. Every skill or experience it cites was checked
 * against the profile: what the model made up was dropped.
 */
export interface JobAlertAnalysis {
  verdict: JobAlertVerdict;
  /** 2 or 3 reasons the offer is worth it, from the profile and the offer. */
  reasons: string[];
  /** Gaps with the profile, missing requirements, signs of a vague advert. */
  watchouts: string[];
  /** What to bring forward in the CV and the letter for this offer. */
  highlights: string[];
}
