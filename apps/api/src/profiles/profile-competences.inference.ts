import { createHash } from "node:crypto";
import type { RomeoCompetence } from "../rome/romeo.client";
import type { StoredProfile } from "./profiles.types";

/**
 * Raised whenever the texts below or the selection change, so every profile
 * is read again once instead of keeping what an older rule inferred.
 */
const INFERENCE_VERSION = 1;

/**
 * Below this, ROMEO's answers were mostly beside the point in the live check
 * of 2026-09-24 — "HubSpot" read as "Applications clientes réseau" at 0.67.
 * Above it noise remains ("Docker" read as "Doctorat" at 0.83): that is what
 * the candidate's removal is for, no threshold separates the two.
 */
const MIN_SCORE = 0.7;
/** A CV holds a few dozen real competences; more is the same ones reworded. */
const MAX_KEPT = 40;

/**
 * The texts ROMEO reads, one competence at most per line: the skills first,
 * the cleanest answers, then each result of each experience, each project and
 * each certification. The summary and the degrees are left out — sent live,
 * they came back as generic web or diploma labels, not as competences.
 */
export function competenceTexts(profile: StoredProfile): string[] {
  const { sections } = profile;

  return [
    ...sections.technicalSkills,
    ...sections.softSkills,
    ...sections.experiences.flatMap((entry) => lines(entry.results)),
    ...sections.personalProjects.flatMap((entry) => lines(entry.description)),
    ...sections.certifications.map((entry) => entry.title),
  ]
    .map((text) => text.trim())
    .filter((text) => text.length > 1);
}

/** What decides whether ROMEO must read the profile again. */
export function textsFingerprint(texts: readonly string[]): string {
  return createHash("sha256")
    .update(JSON.stringify([INFERENCE_VERSION, texts]))
    .digest("hex");
}

/**
 * The competences worth showing: confident enough, not removed by the
 * candidate, each code once with its best score, the most confident first.
 */
export function keptCompetences(
  predictions: readonly RomeoCompetence[],
  dismissed: ReadonlySet<string>,
): RomeoCompetence[] {
  const best = new Map<string, RomeoCompetence>();

  for (const prediction of predictions) {
    if (prediction.score < MIN_SCORE || dismissed.has(prediction.code))
      continue;

    const known = best.get(prediction.code);
    if (!known || prediction.score > known.score)
      best.set(prediction.code, prediction);
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.libelle.localeCompare(b.libelle))
    .slice(0, MAX_KEPT);
}

/** Result lines are typed one per line, or as sentences in one paragraph. */
function lines(text: string): string[] {
  return text
    .split(/\n+|(?<=\.)\s+(?=\p{Lu})/u)
    .map((line) => line.replace(/^[\s\-–•*]+/, ""));
}
