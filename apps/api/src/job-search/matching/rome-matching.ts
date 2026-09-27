import { fold } from "../../shared/text";
import type { ListingCompetence } from "../job-search.types";
import type { StoredJob } from "../jobs.types";

/**
 * The ROME side of the score (US-126): the candidate's métiers against the
 * offer's, and the competences read in their CV against the offer's.
 *
 * Both only ever raise a score. `job-matching` keeps the best of its keyword
 * reading and of this one, so a candidate without any ROME data — nothing
 * confirmed, ROMEO never reached — is scored exactly as before.
 */

/** A ROME competence, reduced to what matching compares. */
export interface RomeCompetenceRef {
  code: string;
  label: string;
}

export interface RomeScoringContext {
  /** Métier codes of the appellations the candidate confirmed. */
  projectCodes: readonly string[];
  /** Competences ROMEO read in the CV, the removed ones left out. */
  profileCompetences: readonly RomeCompetenceRef[];
  /** Per métier code, its competences in the referential. */
  metierCompetences: ReadonlyMap<string, readonly RomeCompetenceRef[]>;
  /**
   * Competences shared by so many métiers that they say nothing about one:
   * "Faire preuve de rigueur et de précision" belongs to 1 231 of 1 911.
   */
  genericCodes: ReadonlySet<string>;
}

/** Same ROME domain (M18, "Systèmes d'information et de télécommunication"). */
const SAME_DOMAIN_SCORE = 0.6;
const DOMAIN_CODE_LENGTH = 3;
/**
 * Offers name one competence in most cases (308 of 420 measured); the métier
 * fallback lists about forty. A few in common is already a strong signal.
 */
const COMPETENCES_FOR_FULL_SCORE = 3;
/** The métier's list says what the job usually asks, not what this offer does. */
const METIER_FALLBACK_FACTOR = 0.8;
/** "À mettre en avant" stays a short list. */
const MAX_MISSING = 5;

/**
 * 1 when the offer is one of the candidate's confirmed métiers, 0.6 when it
 * sits in the same domain, 0 otherwise.
 *
 * The domain and not the "grand domaine" the sprint first named: the grand
 * domaine M puts accounting, HR and software under one letter, and a developer
 * would score 0.6 on every accounting offer.
 */
export function romeTitleScore(
  job: Pick<StoredJob, "romeCode">,
  projectCodes: readonly string[],
): number {
  if (!job.romeCode || projectCodes.length === 0) return 0;
  if (projectCodes.includes(job.romeCode)) return 1;

  const domain = job.romeCode.slice(0, DOMAIN_CODE_LENGTH);

  return projectCodes.some(
    (code) => code.slice(0, DOMAIN_CODE_LENGTH) === domain,
  )
    ? SAME_DOMAIN_SCORE
    : 0;
}

export interface RomeSkillsMatch {
  /** 0 to 1, the share of the skills dimension ROME earns. */
  ratio: number;
  /** Labels of the offer's competences the candidate has, required first. */
  matched: string[];
  /** The offer's competences the CV does not show, required first. */
  missing: string[];
}

/**
 * The offer's competences against the CV's. The offer's own list when it
 * gives one (30 % of France Travail offers), its métier's otherwise; generic
 * competences are left out of both.
 *
 * Only an offer's own list yields "missing" skills: a métier's forty would
 * bury the few that matter under the ones this offer never asked for.
 */
export function romeSkillsMatch(
  job: Pick<StoredJob, "romeCode" | "romeCompetences">,
  context: RomeScoringContext,
): RomeSkillsMatch {
  const own = job.romeCompetences.filter(
    (competence) => !context.genericCodes.has(competence.code),
  );
  const targets: ListingCompetence[] =
    own.length > 0
      ? byRequiredFirst(own)
      : (context.metierCompetences.get(job.romeCode ?? "") ?? [])
          .filter((competence) => !context.genericCodes.has(competence.code))
          .map((competence) => ({ ...competence, required: false }));

  if (targets.length === 0) return { matched: [], missing: [], ratio: 0 };

  const profile = context.profileCompetences.map((competence) => ({
    code: competence.code,
    words: contentWords(competence.label),
  }));
  const has = (target: ListingCompetence) => {
    const words = contentWords(target.label);

    return profile.some(
      (competence) =>
        competence.code === target.code || wordsMatch(competence.words, words),
    );
  };
  const matched = targets.filter(has);
  const ratio =
    Math.min(
      1,
      matched.length / Math.min(COMPETENCES_FOR_FULL_SCORE, targets.length),
    ) * (own.length > 0 ? 1 : METIER_FALLBACK_FACTOR);

  return {
    matched: matched.map((competence) => competence.label),
    missing:
      own.length > 0
        ? targets
            .filter((competence) => !matched.includes(competence))
            .slice(0, MAX_MISSING)
            .map((competence) => competence.label)
        : [],
    ratio,
  };
}

/**
 * Two labels name the same competence when they share at least two
 * meaningful words, and half of the shorter one's. ROMEO rarely lands on the
 * exact code of a métier's list — 3 codes out of 21 for a baker's CV — but
 * "Pétrir des pâtes à pain et à pâtisserie" and "Pétrir manuellement ou
 * mécaniquement des pâtes" are the same thing.
 */
export function wordsMatch(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
): boolean {
  const shared = [...left].filter((word) => right.has(word)).length;

  return shared >= 2 && shared >= Math.min(left.size, right.size) / 2;
}

/**
 * Words that carry the meaning of a competence label. Short words, the ones
 * every label starts with ("Utilisation de…", "Techniques de…") and the
 * framing ones ("Respecter les règles de…", "Normes de…") would make any two
 * labels look alike — "Règles d'hygiène et de sécurité alimentaire" matched
 * "Règles de sécurité informatique" before "regle" was listed here.
 */
const EMPTY_WORDS = new Set([
  "avec",
  "capacite",
  "connaissance",
  "dans",
  "des",
  "etre",
  "faire",
  "leur",
  "maitrise",
  "methode",
  "norme",
  "outil",
  "pour",
  "preuve",
  "realiser",
  "regle",
  "respecter",
  "selon",
  "technique",
  "utilisation",
]);
const MIN_WORD_LENGTH = 4;

export function contentWords(label: string): Set<string> {
  return new Set(
    fold(label)
      .split(" ")
      // A plural and its singular are the same word here: "pâtes", "pâte".
      .map((word) => word.replace(/[sx]$/, ""))
      .filter(
        (word) => word.length >= MIN_WORD_LENGTH && !EMPTY_WORDS.has(word),
      ),
  );
}

function byRequiredFirst(
  competences: readonly ListingCompetence[],
): ListingCompetence[] {
  return [...competences].sort(
    (left, right) => Number(right.required) - Number(left.required),
  );
}
