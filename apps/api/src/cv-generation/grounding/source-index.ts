import type { PromptSafeProfile } from "@cvforge/types";
import { canonicalizeSkill } from "./skill-aliases";
import {
  containsTokenSequence,
  normalizeText,
  tokenize,
} from "./text-normalize";

export interface SourceIndex {
  /** Canonical spelling -> the profile's own wording, for readable reports. */
  skills: Map<string, string>;
  /** Every token of the profile's free text, where skills are often buried. */
  freeTextTokens: string[];
  companies: Map<string, string>;
  institutions: Map<string, string>;
  certifications: Map<string, string>;
  /** Normalised language name -> the level exactly as the profile states it. */
  languages: Map<string, string>;
  projects: Map<string, string>;
}

export type SkillResolution =
  | { status: "exact" | "alias" | "mentioned"; canonical: string }
  | { status: "unsourced" };

function indexBy(values: string[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const value of values) {
    const key = normalizeText(value);
    if (key) index.set(key, value);
  }
  return index;
}

export function buildSourceIndex(profile: PromptSafeProfile): SourceIndex {
  const sections = profile.profileSections;

  const skills = new Map<string, string>();
  for (const skill of [...sections.technicalSkills, ...sections.softSkills]) {
    const key = canonicalizeSkill(skill);
    if (key) skills.set(key, skill);
  }

  // A candidate often writes "migrated the API to NestJS" in an experience
  // without ever listing NestJS as a skill. Without this, the filter would
  // strip skills the candidate genuinely has.
  const freeText = [
    profile.headline,
    sections.summary,
    sections.interests,
    ...sections.experiences.flatMap((item) => [item.results, item.role]),
    ...sections.education.map((item) => `${item.degree} ${item.description ?? ""}`),
    ...sections.personalProjects.map((item) => `${item.title} ${item.description}`),
    ...sections.certifications.map((item) => item.title),
  ].join(" ");

  return {
    certifications: indexBy(sections.certifications.map((item) => item.title)),
    companies: indexBy(sections.experiences.map((item) => item.company)),
    freeTextTokens: tokenize(freeText),
    institutions: indexBy(sections.education.map((item) => item.institution)),
    languages: new Map(
      sections.languages
        .filter((item) => normalizeText(item.language))
        .map((item) => [normalizeText(item.language), item.level]),
    ),
    projects: indexBy(sections.personalProjects.map((item) => item.title)),
    skills,
  };
}

/**
 * Decides whether a generated skill is backed by the profile.
 *
 * Narrowing is allowed ("React Native" in the profile vouches for "React"),
 * widening is not ("React" never vouches for "React Native"): claiming a more
 * specific technology than the source states is exactly the invention we filter.
 */
export function resolveSkill(
  candidate: string,
  index: SourceIndex,
): SkillResolution {
  const normalized = normalizeText(candidate);
  if (!normalized) return { status: "unsourced" };

  if (index.skills.has(normalized)) {
    return { canonical: normalized, status: "exact" };
  }

  const canonical = canonicalizeSkill(candidate);
  if (index.skills.has(canonical)) {
    return { canonical, status: "alias" };
  }

  const tokens = tokenize(candidate);
  for (const sourceKey of index.skills.keys()) {
    if (containsTokenSequence(sourceKey.split(" "), tokens)) {
      return { canonical: sourceKey, status: "mentioned" };
    }
  }

  if (containsTokenSequence(index.freeTextTokens, tokens)) {
    return { canonical: normalized, status: "mentioned" };
  }

  return { status: "unsourced" };
}

export function isSourcedTitle(
  candidate: string,
  index: Map<string, string>,
): boolean {
  const tokens = tokenize(candidate);
  if (tokens.length === 0) return false;

  for (const key of index.keys()) {
    if (containsTokenSequence(key.split(" "), tokens)) return true;
  }
  return false;
}
