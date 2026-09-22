import { isQuantified, startsWithActionVerb } from "../lexicons";
import { countWords, normalizeToken, toScore } from "../normalize";
import type { AtsDocument, AtsFinding } from "../types";

/** Below 8 words a bullet states a task; above 30 it buries the result. */
const MIN_BULLET_WORDS = 8;
const MAX_BULLET_WORDS = 30;

const WEIGHTS = {
  actionVerbs: 30,
  bulletLength: 20,
  quantification: 30,
  skillEvidence: 20,
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
    actionVerbs * WEIGHTS.actionVerbs +
      quantification * WEIGHTS.quantification +
      bulletLength * WEIGHTS.bulletLength +
      skillEvidence * WEIGHTS.skillEvidence,
  );

  const findings: AtsFinding[] = [];

  if (actionVerbs < ACTION_VERB_FLOOR) {
    findings.push({
      code: "MISSING_ACTION_VERBS",
      dimension: "impact",
      severity: "warning",
    });
  }

  if (quantification < QUANTIFICATION_FLOOR) {
    findings.push({
      code: "MISSING_QUANTIFICATION",
      dimension: "impact",
      severity: "critical",
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
 * A list of thirty technologies none of which appears in any bullet is the
 * classic unfalsifiable CV — and the one an interviewer dismantles first.
 */
function skillEvidenceRatio(doc: AtsDocument) {
  if (doc.skills.length === 0) return 0;

  const evidence = normalizeToken(
    doc.experiences
      .flatMap((experience) => [experience.role, ...experience.bullets])
      .join(" "),
  );

  const backed = doc.skills.filter((skill) => {
    const normalized = normalizeToken(skill).trim();

    return normalized.length > 0 && evidence.includes(normalized);
  });

  return backed.length / doc.skills.length;
}
