"use client"

import { useRef, useState, useTransition } from "react"
import { FileUpIcon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { importCvFile, saveProfile } from "@/app/(app)/profile/actions"
import {
  cleanLines,
  FieldGrid,
  ListEditor,
  SpecField,
  type FieldSpec,
} from "@/components/documents/list-editor"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateTime } from "@/lib/format"
import {
  applyImportedCv,
  type BaseProfile,
  type CertificationEntry,
  type EducationEntry,
  type ExperienceEntry,
  type ProjectEntry,
} from "@/lib/profile-model"

type Identity = BaseProfile["identity"]

const identityFields: FieldSpec<Identity>[] = [
  { key: "firstName", label: "Prénom" },
  { key: "lastName", label: "Nom" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Téléphone" },
  { key: "city", label: "Ville" },
  { key: "linkedIn", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "portfolio", label: "Portfolio" },
]

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

const certificationFields: FieldSpec<CertificationEntry>[] = [
  { key: "title", label: "Certification" },
  { key: "issuer", label: "Organisme" },
  { key: "year", label: "Année" },
]

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

function CvImportCard({ onImported }: { onImported: (profile: (p: BaseProfile) => BaseProfile) => void }) {
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importer un CV existant</CardTitle>
        <CardDescription>
          L&apos;IA lit votre CV (PDF ou DOCX, 5 Mo max.) et pré-remplit le profil.
          Vérifiez puis enregistrez. Coût : 2 crédits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          action={(formData) =>
            startTransition(async () => {
              const response = await importCvFile(formData)

              if (!response.ok) {
                toast.error(response.message)
                return
              }

              onImported((profile) => applyImportedCv(profile, response.result.extractedProfile))
              toast.success("CV analysé : vérifiez les champs puis enregistrez.")
              if (inputRef.current) inputRef.current.value = ""
            })
          }
        >
          <Input
            ref={inputRef}
            name="cvFile"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            aria-label="Fichier CV"
            required
          />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? <Spinner /> : <FileUpIcon />}
            {pending ? "Analyse…" : "Analyser"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function ProfileForm({ initialProfile }: { initialProfile: BaseProfile }) {
  const [profile, setProfile] = useState(initialProfile)
  const [saving, startSaving] = useTransition()
  const setSections = <K extends keyof BaseProfile["sections"]>(
    key: K,
    value: BaseProfile["sections"][K]
  ) => setProfile({ ...profile, sections: { ...profile.sections, [key]: value } })

  const save = () =>
    startSaving(async () => {
      const normalized = normalizeProfile(profile)
      const result = await saveProfile(normalized)

      if (result.ok) {
        setProfile({
          ...normalized,
          meta: { ...normalized.meta, lastSavedAt: new Date().toISOString() },
        })
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })

  return (
    <div className="@container/editor flex flex-col gap-4 px-4 lg:px-6">
      <div className="grid gap-4 @5xl/main:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Identité</CardTitle>
            <CardDescription>
              Nom, e-mail et téléphone ne sont jamais envoyés à l&apos;IA : ils sont
              réinjectés après la génération.
            </CardDescription>
            <CardAction>
              <Button onClick={save} disabled={saving}>
                {saving ? <Spinner /> : <SaveIcon />}
                Enregistrer
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SpecField
              id="profile"
              spec={{ key: "headline", label: "Titre professionnel", wide: true }}
              value={profile.headline}
              onChange={(value) => setProfile({ ...profile, headline: value as string })}
            />
            <FieldGrid>
              {identityFields.map((spec) => (
                <SpecField
                  key={spec.key}
                  id="identity"
                  spec={spec}
                  value={profile.identity[spec.key]}
                  onChange={(value) =>
                    setProfile({ ...profile, identity: { ...profile.identity, [spec.key]: value } })
                  }
                />
              ))}
            </FieldGrid>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <CvImportCard onImported={setProfile} />
          <Card>
            <CardHeader>
              <CardDescription>Dernier enregistrement</CardDescription>
              <CardTitle className="text-base">
                {formatDateTime(profile.meta.lastSavedAt)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
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
    </div>
  )
}
