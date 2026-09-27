/**
 * How an offer's match score is built (E19): six criteria, each worth a share
 * of the 100 points. The API scores with these weights; the web shows each
 * criterion against its weight, so the candidate can read "why 65".
 */
export interface ScoreBreakdown {
  title: number;
  skills: number;
  experience: number;
  location: number;
  freshness: number;
  salary: number;
}

/**
 * Sector and company values are deliberately absent: they need a company's NAF
 * code and Egapro index, which arrive with the company sheet (E19 phase 2).
 * Adding them as always-zero dimensions would quietly cap every score at 85.
 */
export const SCORE_WEIGHTS: ScoreBreakdown = {
  experience: 10,
  freshness: 15,
  location: 15,
  salary: 5,
  skills: 25,
  title: 30,
};
