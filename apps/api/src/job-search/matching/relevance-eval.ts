import {
  emptySearchProject,
  type SearchExperienceLevel,
  type SearchProject,
} from "@cvforge/types";
import type { ListingCompetence } from "../job-search.types";
import type { StoredJob } from "../jobs.types";
import { hasTradeEvidence, scoreJob } from "./job-matching";
import type { RomeCompetenceRef, RomeScoringContext } from "./rome-matching";

/**
 * The deterministic score's answer to the relevance evaluation: for each
 * persona × offer pair of the dataset (jobspark-relevance), does the offer
 * belong to the persona's trade?
 *
 * Only the trade is judged. The persona is mobile nationwide and open to any
 * contract, so the hard filters never decide; what is measured is
 * `hasTradeEvidence`, the rule a model would replace.
 */

export interface EvalPersona {
  id: string;
  headline: string;
  targetRoles: string[];
  skills: string[];
  experienceLevel: SearchExperienceLevel | null;
  /** Resolved from the persona's appellations by build_pairs. */
  romeCodes: string[];
  /** What ROMEO read in a real candidate's CV; a made-up persona has none. */
  profileCompetences?: RomeCompetenceRef[];
}

export interface EvalOffer {
  id: string;
  title: string;
  description: string;
  contractType: string;
  romeCode: string | null;
  romeCompetences: ListingCompetence[] | null;
}

export interface EvalExport {
  offers: EvalOffer[];
  metierCompetences: Array<RomeCompetenceRef & { metierCode: string }>;
  genericCodes: string[] | null;
}

export interface EvalPair {
  id: string;
  personaId: string;
  offerId: string;
}

export interface EvalPrediction {
  id: string;
  relevant: boolean;
  title: number;
  skills: number;
  score: number;
}

const EVAL_NOW = Date.parse("2026-01-01T00:00:00Z");

export function predictRelevance(
  data: EvalExport,
  personas: readonly EvalPersona[],
  pairs: readonly EvalPair[],
): EvalPrediction[] {
  const offers = new Map(data.offers.map((offer) => [offer.id, offer]));
  const byPersona = new Map(personas.map((persona) => [persona.id, persona]));
  const metierCompetences = groupByMetier(data.metierCompetences);
  const genericCodes = new Set(data.genericCodes ?? []);

  return pairs.flatMap((pair) => {
    const offer = offers.get(pair.offerId);
    const persona = byPersona.get(pair.personaId);
    if (!offer || !persona) return [];

    const rome: RomeScoringContext = {
      genericCodes,
      metierCompetences,
      profileCompetences: persona.profileCompetences ?? [],
      projectCodes: persona.romeCodes,
    };
    const scored = scoreJob({
      job: toStoredJob(offer),
      now: EVAL_NOW,
      project: toProject(persona),
      rome,
      skills: persona.skills,
    });

    return [
      {
        id: pair.id,
        relevant: hasTradeEvidence(scored),
        score: scored.score,
        skills: scored.breakdown.skills,
        title: scored.breakdown.title,
      },
    ];
  });
}

function groupByMetier(
  rows: EvalExport["metierCompetences"],
): Map<string, RomeCompetenceRef[]> {
  const grouped = new Map<string, RomeCompetenceRef[]>();

  for (const { metierCode, code, label } of rows) {
    grouped.set(metierCode, [...(grouped.get(metierCode) ?? []), { code, label }]);
  }

  return grouped;
}

function toProject(persona: EvalPersona): SearchProject {
  return {
    ...emptySearchProject(persona.id),
    experienceLevel: persona.experienceLevel,
    nationalMobility: true,
    targetRoles: persona.targetRoles,
  };
}

function toStoredJob(offer: EvalOffer): StoredJob {
  const seen = new Date(EVAL_NOW).toISOString();

  return {
    closedAt: null,
    companyAnonymous: false,
    companyKey: "",
    companyLogoUrl: "",
    companyName: "",
    contractType: offer.contractType as StoredJob["contractType"],
    department: "",
    description: offer.description,
    descriptionSimhash: "",
    firstSeenAt: seen,
    id: offer.id,
    lastSeenAt: seen,
    latitude: null,
    locationLabel: "",
    longitude: null,
    primaryUrl: "",
    publishedAt: seen,
    remote: false,
    romeCode: offer.romeCode,
    romeCompetences: offer.romeCompetences ?? [],
    salaryLabel: "",
    title: offer.title,
    titleKey: "",
  };
}
