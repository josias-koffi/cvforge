import type { SearchProject, SearchProjectRomeAppellation } from "@cvforge/types"

import { searchTabHref } from "@/components/job-search/search-tabs"
import { isProfileReady, type BaseProfile } from "@/lib/profile-model"

export type GettingStartedItem = {
  id: string
  label: string
  description: string
  href: string
  done: boolean
}

/**
 * The dashboard's "Bien démarrer" checklist (US-152), read from what the
 * account actually holds rather than from ticks of its own: an item done
 * elsewhere in the app is done here too.
 */
export function gettingStartedItems({
  applications,
  interviews,
  profile,
  project,
  rome,
}: {
  applications: number
  interviews: number
  profile: BaseProfile
  project: SearchProject
  rome: SearchProjectRomeAppellation[]
}): GettingStartedItem[] {
  return [
    {
      description: "Identité, expériences et compétences : la base de vos CV.",
      done: profile.meta.source === "storage" && isProfileReady(profile),
      href:
        profile.meta.source === "storage"
          ? `/profile/${profile.id}`
          : "/bienvenue",
      id: "profil",
      label: "Compléter mon profil",
    },
    {
      description: "Les postes, les lieux et les contrats que vous visez.",
      done: project.updatedAt !== null,
      href: searchTabHref("/ma-recherche", profile.id),
      id: "criteres",
      label: "Définir ma recherche",
    },
    {
      description: "Les métiers qui classent vos offres du jour.",
      done: rome.some((entry) => entry.status === "confirmed"),
      href: searchTabHref("/ma-recherche/metiers", profile.id),
      id: "metiers",
      label: "Confirmer mes métiers",
    },
    {
      description: "Votre sélection d'offres, chaque matin.",
      done: project.updatedAt !== null && project.digestEnabled,
      href: searchTabHref("/ma-recherche/alertes", profile.id),
      id: "alertes",
      label: "Activer mes offres du jour",
    },
    {
      description: "Un CV et une lettre sur mesure pour une offre.",
      done: applications > 0,
      href: "/candidatures/new",
      id: "candidature",
      label: "Créer ma première candidature",
    },
    {
      description: "Un entraînement à l'oral, noté par l'IA.",
      done: interviews > 0,
      href: "/entretiens",
      id: "entretien",
      label: "Passer un premier entretien blanc",
    },
  ]
}
