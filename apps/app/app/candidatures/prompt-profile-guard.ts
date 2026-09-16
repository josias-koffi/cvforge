import type { PromptSafeProfile } from "@cvforge/types";

export const PROFILE_REQUIRED_MESSAGE =
  "Votre profil ne contient ni expérience ni compétence. Complétez-le avant de " +
  "lancer une génération. Aucun crédit n'a été débité.";

/**
 * Returns the prompt profile only when it carries facts to build on.
 *
 * Substituting an empty profile here used to let a generation run on the job
 * offer alone, which the model could only answer by inventing a whole career.
 */
export function readGroundablePromptProfile(
  value: unknown,
): PromptSafeProfile | null {
  const profile = value as PromptSafeProfile | undefined;
  const sections = profile?.profileSections;

  if (!sections) return null;

  const hasFacts =
    (sections.experiences?.length ?? 0) > 0 ||
    (sections.technicalSkills?.length ?? 0) > 0 ||
    (sections.softSkills?.length ?? 0) > 0;

  return hasFacts ? profile! : null;
}
