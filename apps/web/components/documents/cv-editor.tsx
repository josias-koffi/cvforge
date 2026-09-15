"use client"

import { renderCvPdfHtml } from "@cvforge/document-renderer"
import type {
  CVDocumentContent,
  CVDocumentVersionEntry,
  CertificationItemProps,
  EducationItemProps,
  ExperienceItemProps,
  LanguageItemProps,
  ProjectItemProps,
} from "@cvforge/types"

import { saveCv } from "@/app/(app)/offers/[id]/documents-actions"
import { EditorLayout } from "@/components/documents/editor-layout"
import {
  cleanLines,
  FieldGrid,
  ListEditor,
  SpecField,
  type FieldSpec,
} from "@/components/documents/list-editor"
import { useDocumentEditor } from "@/components/documents/use-document-editor"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

type Candidate = CVDocumentContent["candidate"]

const identityFields: FieldSpec<Candidate>[] = [
  { key: "firstName", label: "Prénom" },
  { key: "lastName", label: "Nom" },
  { key: "title", label: "Titre du CV", wide: true },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Téléphone" },
  { key: "city", label: "Ville" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "summary", label: "Accroche", type: "multiline" },
]

const experienceFields: FieldSpec<ExperienceItemProps>[] = [
  { key: "position", label: "Poste" },
  { key: "company", label: "Entreprise" },
  { key: "startDate", label: "Début" },
  { key: "endDate", label: "Fin" },
  { key: "description", label: "Description", type: "multiline" },
  { key: "achievements", label: "Réalisations (une par ligne)", type: "lines" },
]

const educationFields: FieldSpec<EducationItemProps>[] = [
  { key: "degree", label: "Diplôme" },
  { key: "institution", label: "Établissement" },
  { key: "year", label: "Année" },
  { key: "mention", label: "Mention" },
  { key: "description", label: "Description", type: "multiline" },
]

const projectFields: FieldSpec<ProjectItemProps>[] = [
  { key: "title", label: "Projet" },
  { key: "url", label: "Lien" },
  { key: "description", label: "Description", type: "multiline" },
]

const languageFields: FieldSpec<LanguageItemProps>[] = [
  { key: "language", label: "Langue" },
  { key: "level", label: "Niveau" },
]

const certificationFields: FieldSpec<CertificationItemProps>[] = [
  { key: "title", label: "Certification" },
  { key: "issuer", label: "Organisme" },
  { key: "year", label: "Année" },
]

function categoriesToText(content: CVDocumentContent) {
  return (content.skills.categories ?? [])
    .map((category) => `${category.label} : ${category.items.join(", ")}`)
    .join("\n")
}

function textToCategories(text: string) {
  return text
    .split("\n")
    .map((line) => {
      const [label, ...rest] = line.split(":")
      return {
        items: rest.join(":").split(",").map((item) => item.trim()).filter(Boolean),
        label: label.trim(),
      }
    })
    .filter((category) => category.label)
}

function normalizeCv(content: CVDocumentContent): CVDocumentContent {
  return {
    ...content,
    experiences: content.experiences.map((item) => ({
      ...item,
      achievements: cleanLines(item.achievements),
    })),
    skills: {
      ...content.skills,
      hard: cleanLines(content.skills.hard),
      soft: cleanLines(content.skills.soft),
    },
  }
}

function Section({
  children,
  count,
  title,
  value,
}: {
  children: React.ReactNode
  count?: number
  title: string
  value: string
}) {
  return (
    <AccordionItem value={value} className="rounded-lg border px-4 last:border-b">
      <AccordionTrigger className="hover:no-underline">
        <span>
          {title}
          {count !== undefined ? (
            <span className="ml-2 text-muted-foreground">{count}</span>
          ) : null}
        </span>
      </AccordionTrigger>
      <AccordionContent className="pt-1">{children}</AccordionContent>
    </AccordionItem>
  )
}

export function CvEditor({
  cvContent,
  offerId,
  versions,
}: {
  cvContent: CVDocumentContent
  offerId: string
  versions: CVDocumentVersionEntry[]
}) {
  const editor = useDocumentEditor(
    cvContent,
    (content) => saveCv(offerId, content),
    normalizeCv
  )
  const { draft, setDraft } = editor
  const set = <K extends keyof CVDocumentContent>(key: K, value: CVDocumentContent[K]) =>
    setDraft({ ...draft, [key]: value })

  return (
    <EditorLayout
      documentKind="cv"
      offerId={offerId}
      dirty={editor.dirty}
      saving={editor.saving}
      onSave={editor.save}
      onRestore={editor.restore}
      versions={versions}
      previewHtml={renderCvPdfHtml(draft)}
    >
      <Accordion type="multiple" defaultValue={["identity"]} className="flex flex-col gap-3">
        <Section value="identity" title="Identité et accroche">
          <FieldGrid>
            {identityFields.map((spec) => (
              <SpecField
                key={spec.key}
                id="candidate"
                spec={spec}
                value={draft.candidate[spec.key]}
                onChange={(value) =>
                  set("candidate", { ...draft.candidate, [spec.key]: value })
                }
              />
            ))}
          </FieldGrid>
        </Section>
        <Section value="experiences" title="Expériences" count={draft.experiences.length}>
          <ListEditor
            id="experience"
            items={draft.experiences}
            fields={experienceFields}
            onChange={(items) => set("experiences", items)}
            itemTitle={(item, index) =>
              [item.position, item.company].filter(Boolean).join(" · ") || `Expérience ${index + 1}`
            }
            addLabel="Ajouter une expérience"
            createItem={() => ({
              achievements: [],
              company: "",
              description: "",
              endDate: "",
              position: "",
              startDate: "",
            })}
          />
        </Section>
        <Section value="education" title="Formation" count={draft.education.length}>
          <ListEditor
            id="education"
            items={draft.education}
            fields={educationFields}
            onChange={(items) => set("education", items)}
            itemTitle={(item, index) => item.degree || `Formation ${index + 1}`}
            addLabel="Ajouter une formation"
            createItem={() => ({ degree: "", description: "", institution: "", mention: "", year: "" })}
          />
        </Section>
        <Section value="skills" title="Compétences">
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="skills-categories">Compétences par catégorie</FieldLabel>
              <Textarea
                id="skills-categories"
                rows={4}
                value={categoriesToText(draft)}
                onChange={(event) =>
                  set("skills", { ...draft.skills, categories: textToCategories(event.target.value) })
                }
              />
              <FieldDescription>
                Une catégorie par ligne, par exemple « Backend : Node.js, NestJS ».
                Si ce champ est rempli, il remplace la liste simple.
              </FieldDescription>
            </Field>
            <FieldGrid>
              <SpecField
                id="skills"
                spec={{ key: "hard", label: "Techniques (une par ligne)", type: "lines" }}
                value={draft.skills.hard}
                onChange={(value) => set("skills", { ...draft.skills, hard: value as string[] })}
              />
              <SpecField
                id="skills"
                spec={{ key: "soft", label: "Savoir-être (une par ligne)", type: "lines" }}
                value={draft.skills.soft}
                onChange={(value) => set("skills", { ...draft.skills, soft: value as string[] })}
              />
            </FieldGrid>
          </div>
        </Section>
        <Section value="projects" title="Projets" count={draft.projects.length}>
          <ListEditor
            id="project"
            items={draft.projects}
            fields={projectFields}
            onChange={(items) => set("projects", items)}
            itemTitle={(item, index) => item.title || `Projet ${index + 1}`}
            addLabel="Ajouter un projet"
            createItem={() => ({ description: "", title: "", url: "" })}
          />
        </Section>
        <Section value="languages" title="Langues" count={draft.languages.length}>
          <ListEditor
            id="language"
            items={draft.languages}
            fields={languageFields}
            onChange={(items) => set("languages", items)}
            itemTitle={(item, index) => item.language || `Langue ${index + 1}`}
            addLabel="Ajouter une langue"
            createItem={() => ({ language: "", level: "" })}
          />
        </Section>
        <Section value="certifications" title="Certifications" count={draft.certifications.length}>
          <ListEditor
            id="certification"
            items={draft.certifications}
            fields={certificationFields}
            onChange={(items) => set("certifications", items)}
            itemTitle={(item, index) => item.title || `Certification ${index + 1}`}
            addLabel="Ajouter une certification"
            createItem={() => ({ issuer: "", title: "", year: "" })}
          />
        </Section>
        <Section value="interests" title="Centres d'intérêt">
          <Textarea
            aria-label="Centres d'intérêt"
            rows={3}
            value={draft.interests}
            onChange={(event) => set("interests", event.target.value)}
          />
        </Section>
      </Accordion>
    </EditorLayout>
  )
}
