import type {
  ExperienceItemProps,
  GroundingRemoval,
  PromptSafeProfileSections,
} from "@cvforge/types";
import {
  extractNumbers,
  extractYears,
  normalizeText,
  tokenOverlap,
  tokenize,
} from "./text-normalize";

type SourceExperience = PromptSafeProfileSections["experiences"][number];

const MATCH_THRESHOLD = 1.5;
const MAX_FALLBACK_ACHIEVEMENTS = 3;
const ONGOING_PATTERN = /présent|present|aujourd'hui|en cours|current|now/i;

export interface ExperienceLockResult {
  experiences: ExperienceItemProps[];
  removals: GroundingRemoval[];
  lockedExperiences: number;
}

function scorePair(source: SourceExperience, generated: ExperienceItemProps) {
  const company =
    normalizeText(source.company) === normalizeText(generated.company) ? 3 : 0;
  const role = tokenOverlap(tokenize(source.role), tokenize(generated.position)) * 2;
  const sourceYears = new Set(extractYears(source.period));
  const years = extractYears(
    `${generated.startDate} ${generated.endDate}`,
  ).some((year) => sourceYears.has(year))
    ? 1
    : 0;

  return company + role + years;
}

/** Greedy best-first pairing; each side is consumed at most once. */
function pairExperiences(
  sources: SourceExperience[],
  generated: ExperienceItemProps[],
) {
  const pairs: Array<{ source: number; generated: number; score: number }> = [];
  sources.forEach((source, sourceIndex) => {
    generated.forEach((item, generatedIndex) => {
      const score = scorePair(source, item);
      if (score >= MATCH_THRESHOLD) {
        pairs.push({ generated: generatedIndex, score, source: sourceIndex });
      }
    });
  });
  pairs.sort((left, right) => right.score - left.score);

  const matches = new Map<number, number>();
  const usedGenerated = new Set<number>();
  for (const pair of pairs) {
    if (matches.has(pair.source) || usedGenerated.has(pair.generated)) continue;
    matches.set(pair.source, pair.generated);
    usedGenerated.add(pair.generated);
  }

  // Anything still unpaired falls back to relative position.
  const freeGenerated = generated
    .map((_, index) => index)
    .filter((index) => !usedGenerated.has(index));
  sources.forEach((_, sourceIndex) => {
    if (matches.has(sourceIndex)) return;
    const next = freeGenerated.shift();
    if (next !== undefined) {
      matches.set(sourceIndex, next);
      usedGenerated.add(next);
    }
  });

  return { matches, usedGenerated };
}

function splitPeriod(period: string) {
  const parts = period.split(/\s*(?:–|—|-|\bto\b|\bà\b)\s*/i).filter(Boolean);
  return {
    startDate: parts[0]?.trim() ?? period.trim(),
    endDate: parts.slice(1).join(" ").trim(),
  };
}

/**
 * Keeps the model's nicer formatting ("Jan. 2021 – Déc. 2023") only when it
 * describes the same years as the source period, so reformatting is allowed but
 * a shifted date is not.
 */
function reconcileDates(
  generated: ExperienceItemProps | undefined,
  period: string,
) {
  if (!generated) return splitPeriod(period);

  const sourceYears = extractYears(period);
  const generatedYears = extractYears(
    `${generated.startDate} ${generated.endDate}`,
  );
  const sameYears =
    sourceYears.length === generatedYears.length &&
    sourceYears.every((year) => generatedYears.includes(year));

  const sourceOngoing = ONGOING_PATTERN.test(period);
  const generatedOngoing = ONGOING_PATTERN.test(
    `${generated.startDate} ${generated.endDate}`,
  );

  return sameYears && sourceOngoing === generatedOngoing
    ? { startDate: generated.startDate, endDate: generated.endDate }
    : splitPeriod(period);
}

function fallbackAchievements(results: string) {
  return results
    .split(/\n|;|\.\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_FALLBACK_ACHIEVEMENTS);
}

/**
 * Drops any bullet carrying a figure the source does not state. Stripping the
 * figure instead would leave an unsourced performance claim behind.
 */
function guardAchievements(
  generated: ExperienceItemProps | undefined,
  source: SourceExperience,
  removals: GroundingRemoval[],
) {
  const allowed = new Set([
    ...extractNumbers(source.results),
    ...extractNumbers(source.period),
  ]);

  const kept = (generated?.achievements ?? []).filter((achievement) => {
    const unsourced = extractNumbers(achievement).some(
      (number) => !allowed.has(number),
    );
    if (unsourced) {
      removals.push({
        context: source.company,
        kind: "achievement",
        label: achievement,
      });
    }
    return !unsourced;
  });

  return kept.length > 0 ? kept : fallbackAchievements(source.results);
}

/**
 * Rebuilds the experience list from the source profile, so the model can only
 * rephrase. Iterating over the source — not the model's output — guarantees the
 * right count and order however the model reordered, merged or added entries.
 */
export function lockExperiences(
  generated: ExperienceItemProps[],
  sources: SourceExperience[],
): ExperienceLockResult {
  const removals: GroundingRemoval[] = [];
  const { matches, usedGenerated } = pairExperiences(sources, generated);

  generated.forEach((item, index) => {
    if (usedGenerated.has(index)) return;
    removals.push({
      kind: "experience",
      label: [item.position, item.company].filter(Boolean).join(" — "),
    });
  });

  let lockedExperiences = 0;
  const experiences = sources.map((source, sourceIndex) => {
    const match = generated[matches.get(sourceIndex) ?? -1];
    const dates = reconcileDates(match, source.period);

    if (
      match &&
      (normalizeText(match.company) !== normalizeText(source.company) ||
        normalizeText(match.position) !== normalizeText(source.role) ||
        dates.startDate !== match.startDate)
    ) {
      lockedExperiences += 1;
    }

    return {
      achievements: guardAchievements(match, source, removals),
      company: source.company,
      description: match?.description ?? "",
      endDate: dates.endDate,
      position: source.role,
      startDate: dates.startDate,
    };
  });

  return { experiences, lockedExperiences, removals };
}
