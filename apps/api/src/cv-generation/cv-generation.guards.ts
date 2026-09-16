import {
  type CvGenerationRequest,
  type Locale,
  type PromptSafeProfile,
  isLocale,
} from "@cvforge/types";
import {
  BadRequestException,
  UnprocessableEntityException,
} from "@nestjs/common";

export const EMPTY_PROFILE_MESSAGE =
  "Votre profil ne contient ni experience ni competence. Completez-le avant de " +
  "generer un document. Aucun credit n'a ete debite.";

export function assertLocalFieldsProvided(
  localFields: CvGenerationRequest["localFields"],
): void {
  if (!localFields?.lastName && !localFields?.phone && !localFields?.email) {
    throw new BadRequestException(
      "Les champs locaux (lastName, phone, email) doivent être fournis.",
    );
  }
}

/**
 * Without source material the model can only invent, so the request is refused
 * before any AI call — and therefore before any credit is spent.
 */
export function assertProfileIsGroundable(profile: PromptSafeProfile): void {
  const sections = profile?.profileSections;
  const hasFacts =
    (sections?.experiences?.length ?? 0) > 0 ||
    (sections?.technicalSkills?.length ?? 0) > 0 ||
    (sections?.softSkills?.length ?? 0) > 0;

  if (!hasFacts) {
    throw new UnprocessableEntityException(EMPTY_PROFILE_MESSAGE);
  }
}

export function assertTargetLanguage(value: unknown): Locale {
  if (!isLocale(value)) {
    throw new BadRequestException('La langue cible doit être "fr" ou "en".');
  }
  return value;
}
