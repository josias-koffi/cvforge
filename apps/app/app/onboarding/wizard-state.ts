import type { OnboardingDraft } from "./draft";

export type StepDefinition = {
  description: string;
  id: number;
  title: string;
};

export const onboardingSteps: StepDefinition[] = [
  {
    id: 0,
    title: "1. Informations personnelles",
    description: "Prenom, nom, ville, telephone et email professionnel.",
  },
  {
    id: 1,
    title: "2. Liens externes",
    description: "LinkedIn, GitHub, portfolio ou autre lien utile.",
  },
  {
    id: 2,
    title: "3. Informations complementaires",
    description: "Langues, disponibilite, etudes et preferences de recherche.",
  },
  {
    id: 3,
    title: "4. Import de CV existant",
    description: "Etape optionnelle pour rattacher un PDF ou DOCX existant.",
  },
  {
    id: 4,
    title: "5. Recapitulatif & validation",
    description: "Controle final avant redirection vers le tableau de bord.",
  },
];

export function formatSavedAt(value: string | null) {
  if (!value) {
    return "Aucun brouillon local pour le moment.";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Brouillon local enregistre.";
  }

  return `Brouillon repris et enregistre le ${date.toLocaleString("fr-FR")}.`;
}

export function isPersonalStepComplete(draft: OnboardingDraft) {
  return Boolean(
    draft.personal.firstName.trim() &&
      draft.personal.lastName.trim() &&
      draft.personal.city.trim() &&
      draft.personal.phone.trim() &&
      draft.personal.professionalEmail.trim(),
  );
}

export function updateDraftMeta(
  draft: OnboardingDraft,
  currentStep: number,
): OnboardingDraft {
  return {
    ...draft,
    meta: {
      currentStep,
      lastSavedAt: new Date().toISOString(),
    },
  };
}

export function getProgressPercent(currentStep: number) {
  return ((currentStep + 1) / onboardingSteps.length) * 100;
}
