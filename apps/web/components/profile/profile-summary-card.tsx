"use client"

import { FieldGrid, SpecField } from "@/components/documents/list-editor"
import { SectionCard } from "@/components/layout/section-card"
import type { BaseProfile } from "@/lib/profile-model"

type Sections = BaseProfile["sections"]
type SetSection = <K extends keyof Sections>(key: K, value: Sections[K]) => void

/** What the generation leans on most: the pitch and the skills. */
export function ProfileSummaryCard({
  sections,
  setSection,
}: {
  sections: Sections
  setSection: SetSection
}) {
  return (
    <SectionCard
      id="resume"
      title="Résumé et compétences"
      description="Votre accroche et ce que vous savez faire : c'est ce que l'IA reprend en premier."
    >
      <SpecField
        id="sections"
        spec={{ key: "summary", label: "Résumé", type: "multiline" }}
        value={sections.summary}
        onChange={(value) => setSection("summary", value as string)}
      />
      <FieldGrid>
        <SpecField
          id="sections"
          spec={{
            key: "technicalSkills",
            label: "Compétences techniques (une par ligne)",
            type: "lines",
          }}
          value={sections.technicalSkills}
          onChange={(value) => setSection("technicalSkills", value as string[])}
        />
        <SpecField
          id="sections"
          spec={{
            key: "softSkills",
            label: "Savoir-être (un par ligne)",
            type: "lines",
          }}
          value={sections.softSkills}
          onChange={(value) => setSection("softSkills", value as string[])}
        />
      </FieldGrid>
      <SpecField
        id="sections"
        spec={{
          key: "interests",
          label: "Centres d'intérêt",
          type: "multiline",
        }}
        value={sections.interests}
        onChange={(value) => setSection("interests", value as string)}
      />
    </SectionCard>
  )
}
