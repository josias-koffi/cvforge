"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { saveProfile } from "@/app/(app)/profile/actions"
import {
  cleanLines,
  FieldGrid,
  ListEditor,
  SpecField,
  type FieldSpec,
} from "@/components/documents/list-editor"
import { CvDropzone } from "@/components/profile/cv-dropzone"
import { ProfileIdentityCard } from "@/components/profile/profile-identity-card"
import { ProfileSaveBar } from "@/components/profile/profile-save-bar"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  BaseProfile,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProjectEntry,
} from "@/lib/profile-model"

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

/** A profile with substance no longer needs the import zone to sit centre stage. */
function hasContent(profile: BaseProfile) {
  const { experiences, summary, technicalSkills } = profile.sections

  return Boolean(summary.trim() || experiences.length > 0 || technicalSkills.length > 0)
}

function normalizeProfile(profile: BaseProfile): BaseProfile {
  return {
    ...profile,
    sections: {
      ...profile.sections,
      softSkills: cleanLines(profile.sections.softSkills),
      technicalSkills: cleanLines(profile.sections.technicalSkills),
    },
  }
}

export function ProfileForm({
  initialProfile,
  onDirtyChange,
}: {
  initialProfile: BaseProfile
  onDirtyChange: (dirty: boolean) => void
}) {
  const [profile, setProfile] = useState(initialProfile)
  const [savedProfile, setSavedProfile] = useState(initialProfile)
  const [saving, startSaving] = useTransition()
  const dirty = JSON.stringify(profile) !== JSON.stringify(savedProfile)
  const setSections = <K extends keyof BaseProfile["sections"]>(
    key: K,
    value: BaseProfile["sections"][K]
  ) => setProfile({ ...profile, sections: { ...profile.sections, [key]: value } })
  const setPreferences = <K extends keyof BaseProfile["preferences"]>(
    key: K,
    value: BaseProfile["preferences"][K]
  ) => setProfile({ ...profile, preferences: { ...profile.preferences, [key]: value } })

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const save = () =>
    startSaving(async () => {
      const normalized = normalizeProfile(profile)
      const result = await saveProfile(normalized)

      if (result.ok) {
        const saved = {
          ...normalized,
          meta: { ...normalized.meta, lastSavedAt: new Date().toISOString() },
        }
        setProfile(saved)
        setSavedProfile(saved)
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })

  return (
    <div className="@container/editor flex min-w-0 flex-col gap-4">
      <CvDropzone compact={hasContent(profile)} onImported={setProfile} />
      <ProfileIdentityCard profile={profile} onChange={setProfile} />
      <Card>
        <CardContent>
          <Tabs defaultValue="summary" className="gap-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="summary">Résumé et compétences</TabsTrigger>
              <TabsTrigger value="experiences">
                Expériences ({profile.sections.experiences.length})
              </TabsTrigger>
              <TabsTrigger value="education">
                Formation ({profile.sections.education.length})
              </TabsTrigger>
              <TabsTrigger value="projects">
                Projets ({profile.sections.personalProjects.length})
              </TabsTrigger>
              <TabsTrigger value="search">Recherche</TabsTrigger>
              <TabsTrigger value="languages">
                Langues ({profile.sections.languages.length})
              </TabsTrigger>
              <TabsTrigger value="certifications">
                Certifications ({profile.sections.certifications.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="flex flex-col gap-4">
              <SpecField
                id="sections"
                spec={{ key: "summary", label: "Résumé", type: "multiline" }}
                value={profile.sections.summary}
                onChange={(value) => setSections("summary", value as string)}
              />
              <FieldGrid>
                <SpecField
                  id="sections"
                  spec={{ key: "technicalSkills", label: "Compétences techniques (une par ligne)", type: "lines" }}
                  value={profile.sections.technicalSkills}
                  onChange={(value) => setSections("technicalSkills", value as string[])}
                />
                <SpecField
                  id="sections"
                  spec={{ key: "softSkills", label: "Savoir-être (un par ligne)", type: "lines" }}
                  value={profile.sections.softSkills}
                  onChange={(value) => setSections("softSkills", value as string[])}
                />
              </FieldGrid>
              <SpecField
                id="sections"
                spec={{ key: "interests", label: "Centres d'intérêt", type: "multiline" }}
                value={profile.sections.interests}
                onChange={(value) => setSections("interests", value as string)}
              />
            </TabsContent>
            <TabsContent value="experiences">
              <ListEditor
                id="experience"
                items={profile.sections.experiences}
                fields={experienceFields}
                onChange={(items) => setSections("experiences", items)}
                itemTitle={(item, index) =>
                  [item.role, item.company].filter(Boolean).join(" · ") || `Expérience ${index + 1}`
                }
                addLabel="Ajouter une expérience"
                createItem={() => ({ company: "", period: "", results: "", role: "" })}
              />
            </TabsContent>
            <TabsContent value="education">
              <ListEditor
                id="education"
                items={profile.sections.education}
                fields={educationFields}
                onChange={(items) => setSections("education", items)}
                itemTitle={(item, index) => item.degree || `Formation ${index + 1}`}
                addLabel="Ajouter une formation"
                createItem={() => ({ degree: "", description: "", honors: "", institution: "", year: "" })}
              />
            </TabsContent>
            <TabsContent value="projects">
              <ListEditor
                id="project"
                items={profile.sections.personalProjects}
                fields={projectFields}
                onChange={(items) => setSections("personalProjects", items)}
                itemTitle={(item, index) => item.title || `Projet ${index + 1}`}
                addLabel="Ajouter un projet"
                createItem={() => ({ description: "", link: "", title: "" })}
              />
            </TabsContent>
            <TabsContent value="search" className="flex flex-col gap-4">
              <p className="text-muted-foreground text-sm">
                Utilisé uniquement dans la lettre de motivation. Laissez vide pour
                ne pas aborder le sujet.
              </p>
              <FieldGrid>
                <SpecField
                  id="preferences"
                  spec={{ key: "availabilityDate", label: "Disponible à partir du" }}
                  value={profile.preferences.availabilityDate}
                  onChange={(value) =>
                    setProfile({
                      ...profile,
                      preferences: {
                        ...profile.preferences,
                        availabilityDate: value as string,
                        availabilityMode: (value as string).trim() ? "date" : "",
                      },
                    })
                  }
                />
                <SpecField
                  id="preferences"
                  spec={{ key: "contractTypes", label: "Contrats recherchés (ex. CDI, freelance)" }}
                  value={profile.preferences.contractTypes}
                  onChange={(value) => setPreferences("contractTypes", value as string)}
                />
              </FieldGrid>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={profile.preferences.availabilityMode === "immediate"}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      preferences: {
                        ...profile.preferences,
                        availabilityDate: event.target.checked
                          ? ""
                          : profile.preferences.availabilityDate,
                        availabilityMode: event.target.checked ? "immediate" : "",
                      },
                    })
                  }
                  type="checkbox"
                />
                Disponible immédiatement
              </label>
            </TabsContent>
            <TabsContent value="languages">
              <ListEditor
                id="language"
                items={profile.sections.languages}
                fields={languageFields}
                onChange={(items) => setSections("languages", items)}
                itemTitle={(item, index) => item.language || `Langue ${index + 1}`}
                addLabel="Ajouter une langue"
                createItem={() => ({ language: "", level: "" })}
              />
            </TabsContent>
            <TabsContent value="certifications">
              <ListEditor
                id="certification"
                items={profile.sections.certifications}
                fields={certificationFields}
                onChange={(items) => setSections("certifications", items)}
                itemTitle={(item, index) => item.title || `Certification ${index + 1}`}
                addLabel="Ajouter une certification"
                createItem={() => ({ issuer: "", title: "", year: "" })}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <ProfileSaveBar
        dirty={dirty}
        lastSavedAt={savedProfile.meta.lastSavedAt}
        saving={saving}
        onReset={() => setProfile(savedProfile)}
        onSave={save}
      />
    </div>
  )
}
