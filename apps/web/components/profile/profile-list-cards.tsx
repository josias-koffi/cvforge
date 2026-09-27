"use client"

import { ListEditor, type FieldSpec } from "@/components/documents/list-editor"
import { SectionCard } from "@/components/layout/section-card"
import type {
  BaseProfile,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProjectEntry,
} from "@/lib/profile-model"

type Sections = BaseProfile["sections"]
type SetSection = <K extends keyof Sections>(key: K, value: Sections[K]) => void

const experienceFields: FieldSpec<ExperienceEntry>[] = [
  { key: "role", label: "Poste" },
  { key: "company", label: "Entreprise" },
  { key: "period", label: "Période", wide: true },
  { key: "results", label: "Missions et résultats", type: "multiline" },
]

const educationFields: FieldSpec<EducationEntry>[] = [
  { key: "degree", label: "Diplôme" },
  { key: "institution", label: "Établissement" },
  { key: "year", label: "Année" },
  { key: "honors", label: "Mention" },
  { key: "description", label: "Description", type: "multiline" },
]

const projectFields: FieldSpec<ProjectEntry>[] = [
  { key: "title", label: "Projet" },
  { key: "link", label: "Lien" },
  { key: "description", label: "Description", type: "multiline" },
]

const languageFields: FieldSpec<LanguageEntry>[] = [
  { key: "language", label: "Langue" },
  { key: "level", label: "Niveau (ex. C1 / Courant)" },
]

const certificationFields: FieldSpec<CertificationEntry>[] = [
  { key: "title", label: "Certification" },
  { key: "issuer", label: "Organisme" },
  { key: "year", label: "Année" },
]

/** The repeated sections of a profile, one card each, in the outline's order. */
export function ProfileListCards({
  sections,
  setSection,
}: {
  sections: Sections
  setSection: SetSection
}) {
  return (
    <>
      <SectionCard
        id="experiences"
        title="Expériences"
        description="Vos postes, du plus récent au plus ancien. Chiffrez les résultats quand vous le pouvez."
      >
        <ListEditor
          id="experience"
          items={sections.experiences}
          fields={experienceFields}
          onChange={(items) => setSection("experiences", items)}
          itemTitle={(item, index) =>
            [item.role, item.company].filter(Boolean).join(" · ") ||
            `Expérience ${index + 1}`
          }
          addLabel="Ajouter une expérience"
          createItem={() => ({
            company: "",
            period: "",
            results: "",
            role: "",
          })}
        />
      </SectionCard>

      <SectionCard
        id="formation"
        title="Formation"
        description="Diplômes et établissements."
      >
        <ListEditor
          id="education"
          items={sections.education}
          fields={educationFields}
          onChange={(items) => setSection("education", items)}
          itemTitle={(item, index) => item.degree || `Formation ${index + 1}`}
          addLabel="Ajouter une formation"
          createItem={() => ({
            degree: "",
            description: "",
            honors: "",
            institution: "",
            year: "",
          })}
        />
      </SectionCard>

      <SectionCard
        id="projets"
        title="Projets"
        description="Projets personnels ou open source qui montrent ce que vous savez faire."
      >
        <ListEditor
          id="project"
          items={sections.personalProjects}
          fields={projectFields}
          onChange={(items) => setSection("personalProjects", items)}
          itemTitle={(item, index) => item.title || `Projet ${index + 1}`}
          addLabel="Ajouter un projet"
          createItem={() => ({ description: "", link: "", title: "" })}
        />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          id="langues"
          title="Langues"
          description="Avec votre niveau."
        >
          <ListEditor
            id="language"
            items={sections.languages}
            fields={languageFields}
            onChange={(items) => setSection("languages", items)}
            itemTitle={(item, index) => item.language || `Langue ${index + 1}`}
            addLabel="Ajouter une langue"
            createItem={() => ({ language: "", level: "" })}
          />
        </SectionCard>
        <SectionCard
          id="certifications"
          title="Certifications"
          description="Titres et certificats obtenus."
        >
          <ListEditor
            id="certification"
            items={sections.certifications}
            fields={certificationFields}
            onChange={(items) => setSection("certifications", items)}
            itemTitle={(item, index) =>
              item.title || `Certification ${index + 1}`
            }
            addLabel="Ajouter une certification"
            createItem={() => ({ issuer: "", title: "", year: "" })}
          />
        </SectionCard>
      </div>
    </>
  )
}
