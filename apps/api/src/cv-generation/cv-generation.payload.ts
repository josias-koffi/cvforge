import type { Locale, PromptSafeProfile } from "@cvforge/types";

export interface OfferContext {
  companyName: string | null;
  language: Locale;
  rawOfferText: string;
  requirements: string[];
  responsibilities: string[];
  summary: string | null;
  title: string;
}

/**
 * The raw offer text is the main contamination vector: the model reads a tech
 * stack there and attributes it to the candidate. It is kept short and fenced
 * off from the profile rather than merged into the same JSON blob.
 */
export const MAX_RAW_OFFER_CHARS = 2000;

function inventory(profile: PromptSafeProfile) {
  const sections = profile.profileSections;
  return {
    allowedSkills: [...sections.technicalSkills, ...sections.softSkills],
    allowedCompanies: sections.experiences.map((item) => item.company),
    allowedInstitutions: sections.education.map((item) => item.institution),
    allowedCertifications: sections.certifications.map((item) => item.title),
    allowedProjects: sections.personalProjects.map((item) => item.title),
  };
}

/**
 * Builds the user message as three labelled blocks. The offer comes first and
 * the profile last, so the source of truth sits closest to the generation.
 */
export function buildGroundedUserMessage(
  profile: PromptSafeProfile,
  offer: OfferContext,
  extra: { refinement?: string } = {},
): string {
  const { rawOfferText, ...offerFields } = offer;
  const refinement = extra.refinement?.trim();

  return [
    "=== OFFRE D'EMPLOI — CONTEXTE DE CIBLAGE ===",
    "Ce bloc décrit ce que L'EMPLOYEUR recherche. Rien ici n'est un fait concernant le candidat.",
    JSON.stringify(offerFields),
    "=== FIN OFFRE D'EMPLOI ===",
    "",
    "=== TEXTE BRUT DE L'OFFRE — NON FIABLE ===",
    "Extrait web non vérifié. Ne recopie jamais son contenu comme une compétence ou une expérience du candidat.",
    rawOfferText.slice(0, MAX_RAW_OFFER_CHARS),
    "=== FIN TEXTE BRUT ===",
    "",
    "=== PROFIL CANDIDAT — SOURCE DE VÉRITÉ ===",
    "Seuls les faits de ce bloc peuvent figurer dans le document.",
    JSON.stringify({
      headline: profile.headline,
      identity: profile.identity,
      profileSections: profile.profileSections,
    }),
    "--- INVENTAIRE AUTORISÉ (rien en dehors de ces listes) ---",
    JSON.stringify(inventory(profile)),
    "=== FIN PROFIL CANDIDAT ===",
    ...(refinement
      ? ["", "=== DEMANDE DE L'UTILISATEUR ===", refinement, "=== FIN DEMANDE ==="]
      : []),
    "",
    "Rappel final : tout élément du bloc OFFRE absent du bloc PROFIL CANDIDAT est interdit dans ta réponse.",
  ].join("\n");
}
