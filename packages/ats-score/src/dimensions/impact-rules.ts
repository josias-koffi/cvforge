import { isQuantified, startsWithActionVerb } from "../lexicons";
import { clamp, countWords, normalizeToken, toScore } from "../normalize";
import type { AtsDocument, AtsFinding } from "../types";

/**
 * Below 5 words a bullet states a job title; above 30 it buries the result.
 *
 * The floor was 8, which is an English-résumé figure: French is denser, and
 * "Encadrement de deux développeurs juniors" says everything it needs to in
 * five words. Penalising it rewarded padding.
 */
const MIN_BULLET_WORDS = 5;
const MAX_BULLET_WORDS = 30;

const WEIGHTS = {
  actionVerbs: 30,
  bulletLength: 20,
  quantification: 30,
  skillEvidence: 20,
} as const;

/**
 * The coverage at which a sub-score is already worth full marks.
 *
 * None of these is a target of 100 %: a CV whose every single bullet carries a
 * figure reads as manufactured, and one that restates a skill in every line is
 * stuffing. This is the same reasoning `keywords` has always applied with its
 * 60 % ceiling — a good CV should be able to reach 100 on this dimension
 * without being written for the parser.
 */
const FULL_CREDIT = {
  actionVerbs: 0.8,
  bulletLength: 0.8,
  quantification: 0.5,
  skillEvidence: 0.6,
} as const;

const ACTION_VERB_FLOOR = 0.5;
const QUANTIFICATION_FLOOR = 0.3;
const SKILL_EVIDENCE_FLOOR = 0.5;

/**
 * How much the writing sells the work, judged by rules alone.
 *
 * This is the fallback the model refines but never replaces: it is always
 * computed, and `impact` is clamped to ±25 around it. A provider outage or a
 * malformed answer therefore costs detail, never a score.
 */
export function scoreImpactByRules(doc: AtsDocument) {
  const bullets = doc.experiences.flatMap((experience) => experience.bullets);

  // No bullets means nothing to judge — and crediting the absence of weak
  // writing would hand points to a CV that wrote nothing at all.
  if (bullets.length === 0) {
    return {
      findings: [
        {
          code: "MISSING_ACTION_VERBS" as const,
          dimension: "impact" as const,
          severity: "critical" as const,
        },
      ],
      score: 0,
    };
  }

  const actionVerbs = ratio(bullets, startsWithActionVerb);
  const quantification = ratio(bullets, isQuantified);
  const bulletLength = ratio(bullets, isWellSized);
  const skillEvidence = skillEvidenceRatio(doc);

  const score = toScore(
    credit(actionVerbs, "actionVerbs") +
      credit(quantification, "quantification") +
      credit(bulletLength, "bulletLength") +
      credit(skillEvidence, "skillEvidence"),
  );

  const findings: AtsFinding[] = [];

  if (actionVerbs < ACTION_VERB_FLOOR) {
    findings.push({
      code: "MISSING_ACTION_VERBS",
      dimension: "impact",
      severity: "warning",
    });
  }

  /**
   * Critical only when there is not a single figure in the whole CV — that is
   * the "duties, no results" document the ceiling was written for. A quarter of
   * the bullets quantified is a CV with room to improve, not a disqualified
   * one, and capping it at 80 held good CVs a full band below where they
   * belong.
   */
  if (quantification < QUANTIFICATION_FLOOR) {
    findings.push({
      code: "MISSING_QUANTIFICATION",
      dimension: "impact",
      severity: quantification === 0 ? "critical" : "warning",
    });
  }

  if (skillEvidence < SKILL_EVIDENCE_FLOOR) {
    findings.push({
      code: "UNSUPPORTED_SKILLS",
      dimension: "impact",
      severity: "warning",
    });
  }

  return { findings, score };
}

/** A sub-score's share of its weight, full marks from its full-credit coverage on. */
function credit(ratio: number, key: keyof typeof WEIGHTS) {
  return clamp(ratio / FULL_CREDIT[key], 0, 1) * WEIGHTS[key];
}

function ratio(bullets: string[], predicate: (bullet: string) => boolean) {
  return bullets.filter(predicate).length / bullets.length;
}

function isWellSized(bullet: string) {
  const words = countWords(bullet);

  return words >= MIN_BULLET_WORDS && words <= MAX_BULLET_WORDS;
}

/**
 * Skills claimed in the skills section that the experience actually backs up.
 *
 * A list of thirty technologies none of which appears anywhere else in the CV
 * is the classic unfalsifiable CV — and the one an interviewer dismantles
 * first. Anywhere else is the point: the summary counts, and so does a project
 * or a diploma. Requiring the proof inside a bullet was asking the candidate to
 * repeat their stack line after line.
 */
function skillEvidenceRatio(doc: AtsDocument) {
  if (doc.skills.length === 0) return 0;

  const evidence = normalizeToken(doc.evidenceText);

  const backed = doc.skills.filter((skill) => {
    const normalized = normalizeToken(skill).trim();

    return normalized.length > 0 && evidence.includes(normalized);
  });

  return backed.length / doc.skills.length;
}
