import type { OutlineItem } from "@/components/layout/section-outline"
import { candidateName, type BaseProfile } from "@/lib/profile-model"

function count(total: number, singular: string, plural: string) {
  if (total === 0) return "À compléter"
  return `${total} ${total > 1 ? plural : singular}`
}

function availability({ preferences }: BaseProfile) {
  if (preferences.availabilityMode === "immediate") return "Immédiate"
  if (preferences.availabilityDate.trim()) {
    return `À partir du ${preferences.availabilityDate.trim()}`
  }
  return "Non précisée"
}

/**
 * The profile's sections as the outline shows them, in the order of the
 * cards: what each holds, and whether it is filled — the generation works
 * from nothing else.
 */
export function profileOutline(profile: BaseProfile): OutlineItem[] {
  const { identity, sections } = profile
  const skills = sections.technicalSkills.length + sections.softSkills.length

  return [
    {
      detail: candidateName(profile) || "À compléter",
      done: Boolean(identity.firstName.trim() && identity.email.trim()),
      id: "identite",
      label: "Identité",
    },
    {
      detail:
        skills > 0
          ? count(skills, "compétence", "compétences")
          : sections.summary.trim()
            ? "Résumé rédigé"
            : "À compléter",
      done: Boolean(sections.summary.trim() || skills > 0),
      id: "resume",
      label: "Résumé et compétences",
    },
    {
      detail: count(sections.experiences.length, "expérience", "expériences"),
      done: sections.experiences.length > 0,
      id: "experiences",
      label: "Expériences",
    },
    {
      detail: count(sections.education.length, "formation", "formations"),
      done: sections.education.length > 0,
      id: "formation",
      label: "Formation",
    },
    {
      detail: count(sections.personalProjects.length, "projet", "projets"),
      done: sections.personalProjects.length > 0,
      id: "projets",
      label: "Projets",
    },
    {
      detail: count(sections.languages.length, "langue", "langues"),
      done: sections.languages.length > 0,
      id: "langues",
      label: "Langues",
    },
    {
      detail: count(
        sections.certifications.length,
        "certification",
        "certifications"
      ),
      done: sections.certifications.length > 0,
      id: "certifications",
      label: "Certifications",
    },
    {
      detail: availability(profile),
      done: profile.preferences.availabilityMode !== "",
      id: "disponibilite",
      label: "Disponibilité",
    },
  ]
}
