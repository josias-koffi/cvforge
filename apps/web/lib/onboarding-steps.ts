import type { SearchProject } from "@cvforge/types"

import { isProfileReady, type BaseProfile } from "@/lib/profile-model"

/** The steps of the first-login onboarding (US-150), in order. */
export const ONBOARDING_STEPS = [
  {
    id: "bienvenue",
    label: "Bienvenue",
    title: "Bienvenue sur CVSpark",
    lede: "Cinq minutes pour poser les bases : votre profil, ce que vous cherchez, et vos offres du jour arrivent dès demain matin.",
    why: "Tout ce que CVSpark produit — CV sur mesure, lettres, offres classées, entretiens — part de ces informations. Les renseigner une fois vous évite de les retaper à chaque candidature.",
    tip: "Vous avez un CV sous la main ? Importez-le : l'IA remplit votre profil, vous n'avez plus qu'à vérifier.",
  },
  {
    id: "identite",
    label: "Identité",
    title: "Qui êtes-vous ?",
    lede: "Votre nom, votre titre et vos coordonnées : l'en-tête de chacun de vos CV.",
    why: "Votre nom et vos coordonnées restent chez nous : ils ne sont jamais envoyés à l'IA, qui ne voit qu'un profil anonymisé.",
    tip: "Le titre (par exemple « Développeuse full-stack ») est la première ligne qu'un recruteur lit. Restez proche des intitulés des annonces.",
  },
  {
    id: "parcours",
    label: "Parcours",
    title: "Votre parcours",
    lede: "Vos expériences, vos compétences, vos formations : la matière de vos CV et de vos lettres.",
    why: "L'IA ne peut mettre en valeur que ce que vous avez écrit ici. Plus vos expériences sont précises (résultats, chiffres, outils), plus vos CV sur mesure sont convaincants.",
    tip: "Une expérience et quelques compétences suffisent pour commencer. Vous compléterez le reste depuis « Profil » quand vous voudrez.",
  },
  {
    id: "poste",
    label: "Poste visé",
    title: "Ce que vous cherchez",
    lede: "Les postes que vous visez, votre niveau et les contrats qui vous intéressent.",
    why: "Ces intitulés servent à chercher les offres et à trouver les métiers correspondants dans le référentiel de France Travail.",
    tip: "Écrivez-les comme dans les annonces, un par ligne. Plusieurs variantes (« Chef de projet », « Project manager ») élargissent la recherche.",
  },
  {
    id: "lieu",
    label: "Lieu",
    title: "Où et comment",
    lede: "Les villes où vous cherchez, le télétravail et votre salaire minimum.",
    why: "Les offres du jour ne gardent que celles qui tombent dans votre zone. Sans lieu, la sélection couvre toute la France.",
    tip: "Ajoutez plusieurs villes si vous êtes mobile, et ajustez le rayon de chacune.",
  },
  {
    id: "metiers",
    label: "Métiers",
    title: "Vos métiers",
    lede: "Nous avons traduit vos postes en métiers du référentiel de France Travail. Confirmez ceux qui vous correspondent.",
    why: "Les métiers confirmés classent vos offres du jour et alimentent le marché de l'emploi et les entreprises qui recrutent.",
    tip: "Écartez ceux qui ne vous ressemblent pas : ils ne reviendront pas. Vous pouvez aussi en chercher un autre.",
  },
  {
    id: "alertes",
    label: "C'est parti",
    title: "Vos offres du jour",
    lede: "Dernière étape : choisissez comment recevoir votre sélection du matin.",
    why: "Chaque matin, CVSpark sélectionne les offres qui correspondent à vos critères et à vos métiers. Rien ne vous oblige à les recevoir par e-mail.",
    tip: "Tout ce que vous venez de remplir se modifie plus tard depuis « Profil » et « Ma recherche ».",
  },
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"]
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export function isOnboardingStep(value: unknown): value is OnboardingStepId {
  return ONBOARDING_STEPS.some((step) => step.id === value)
}

export function stepIndex(id: OnboardingStepId) {
  return ONBOARDING_STEPS.findIndex((step) => step.id === id)
}

/**
 * Where the onboarding opens: the step in the address when there is one,
 * otherwise the first thing still missing — so "Reprendre" lands where the
 * candidate left off.
 */
export function initialStep(
  requested: string | string[] | undefined,
  profile: BaseProfile,
  project: SearchProject
): OnboardingStepId {
  if (isOnboardingStep(requested)) return requested
  if (profile.meta.source !== "storage") return "bienvenue"
  if (!profile.identity.firstName.trim()) return "identite"
  if (!isProfileReady(profile)) return "parcours"
  if (project.updatedAt === null) return "poste"
  return "metiers"
}

/** What a step still needs before "Continuer"; null when nothing. */
export function missingForStep(
  step: OnboardingStepId,
  profile: BaseProfile,
  project: SearchProject
): string | null {
  if (step === "identite") {
    const { firstName, lastName } = profile.identity
    if (!firstName.trim() || !lastName.trim()) {
      return "Indiquez au moins votre prénom et votre nom."
    }
  }

  if (step === "poste" && project.targetRoles.every((role) => !role.trim())) {
    return "Indiquez au moins un poste visé : c'est lui qui trouve vos offres."
  }

  return null
}
