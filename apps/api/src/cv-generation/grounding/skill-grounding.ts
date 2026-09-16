import type {
  GroundingRemoval,
  PromptSafeProfile,
  SkillCategory,
} from "@cvforge/types";
import { resolveSkill, type SourceIndex } from "./source-index";

const FALLBACK_CATEGORY_LABEL = "Compétences";
const MAX_FALLBACK_ITEMS = 6;

/** A CV with no skills at all is worse than a conservative one. */
function fallbackSkills(profile: PromptSafeProfile) {
  return profile.profileSections.technicalSkills.slice(0, MAX_FALLBACK_ITEMS);
}

export interface SkillGroundingResult {
  categories: SkillCategory[] | undefined;
  hard: string[];
  removals: GroundingRemoval[];
}

/**
 * Drops every generated skill the profile does not back up.
 *
 * Category labels are left alone: they are a taxonomy the model invents to
 * organise the CV ("Pratiques agiles"), not a claim about the candidate.
 */
export function groundSkills(
  categories: SkillCategory[] | undefined,
  hard: string[],
  index: SourceIndex,
  profile: PromptSafeProfile,
): SkillGroundingResult {
  const removals: GroundingRemoval[] = [];

  const keep = (skill: string, context?: string) => {
    if (resolveSkill(skill, index).status !== "unsourced") return true;
    removals.push({ kind: "skill", label: skill, ...(context ? { context } : {}) });
    return false;
  };

  if (!categories) {
    const groundedHard = hard.filter((skill) => keep(skill));
    return {
      categories: undefined,
      hard: groundedHard.length > 0 ? groundedHard : fallbackSkills(profile),
      removals,
    };
  }

  const grounded = categories
    .map((category) => ({
      label: category.label,
      items: category.items.filter((item) => keep(item, category.label)),
    }))
    .filter((category) => category.items.length > 0);

  if (grounded.length === 0) {
    const fallback = fallbackSkills(profile);
    if (fallback.length === 0) {
      return { categories: undefined, hard: [], removals };
    }
    return {
      categories: [{ label: FALLBACK_CATEGORY_LABEL, items: fallback }],
      hard: fallback,
      removals,
    };
  }

  return {
    categories: grounded,
    hard: grounded.flatMap((category) => category.items),
    removals,
  };
}
