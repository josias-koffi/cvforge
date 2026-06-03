"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@cvforge/ui";
import type {
  CertificationItemProps,
  CVDocumentContent,
  EducationItemProps,
  ExperienceItemProps,
  LanguageItemProps,
  ProjectItemProps,
} from "@cvforge/types";

type CvEditorFieldsProps = {
  draft: CVDocumentContent;
  onChange: React.Dispatch<React.SetStateAction<CVDocumentContent>>;
};

function Field({
  children,
  id,
  label,
}: {
  children: React.ReactNode;
  id: string;
  label: string;
}) {
  return (
    <div style={{ display: "grid", gap: "0.4rem" }}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function SectionCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent style={{ display: "grid", gap: "1rem" }}>
        {children}
      </CardContent>
    </Card>
  );
}

function TextListField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  onChange: (value: string[]) => void;
  value: string[];
}) {
  return (
    <Field id={id} label={label}>
      <Textarea
        id={id}
        rows={3}
        value={value.join("\n")}
        onChange={(event) =>
          onChange(
            event.target.value
              .split("\n")
              .map((entry) => entry.trim())
              .filter((entry) => entry.length > 0),
          )
        }
      />
    </Field>
  );
}

function EntryList<TEntry>({
  entries,
  render,
}: {
  entries: TEntry[];
  render: (entry: TEntry, index: number) => React.ReactNode;
}) {
  if (entries.length === 0) {
    return <p style={{ color: "#6B6860", margin: 0 }}>Aucune entrée.</p>;
  }

  return <>{entries.map(render)}</>;
}

export function CvEditorFields({ draft, onChange }: CvEditorFieldsProps) {
  function updateCandidate(
    field: keyof CVDocumentContent["candidate"],
    value: string,
  ) {
    onChange((current) => ({
      ...current,
      candidate: { ...current.candidate, [field]: value },
    }));
  }

  function updateSkills(
    field: keyof Pick<CVDocumentContent["skills"], "hard" | "soft">,
    value: string[],
  ) {
    onChange((current) => ({
      ...current,
      skills: { ...current.skills, [field]: value },
    }));
  }

  function updateArrayEntry<TEntry>(
    collection: keyof Pick<
      CVDocumentContent,
      "certifications" | "education" | "experiences" | "languages" | "projects"
    >,
    index: number,
    patch: Partial<TEntry>,
  ) {
    onChange((current) => ({
      ...current,
      [collection]: (current[collection] as TEntry[]).map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <SectionCard
        description="Coordonnées réinjectées localement dans le CV généré."
        title="En-tête"
      >
        {(
          [
            ["firstName", "Prénom"],
            ["lastName", "Nom"],
            ["title", "Titre"],
            ["phone", "Téléphone"],
            ["email", "Email"],
            ["city", "Ville"],
            ["linkedin", "LinkedIn"],
            ["github", "GitHub"],
          ] as const
        ).map(([field, label]) => (
          <Field id={`cv-candidate-${field}`} key={field} label={label}>
            <Input
              id={`cv-candidate-${field}`}
              value={draft.candidate[field]}
              onChange={(event) => updateCandidate(field, event.target.value)}
            />
          </Field>
        ))}
      </SectionCard>

      <SectionCard
        description="Accroche courte et centres d'intérêt affichés dans l'aperçu."
        title="Profil"
      >
        <Field id="cv-summary" label="Résumé">
          <Textarea
            id="cv-summary"
            rows={5}
            value={draft.candidate.summary}
            onChange={(event) => updateCandidate("summary", event.target.value)}
          />
        </Field>
        <Field id="cv-interests" label="Centres d'intérêt">
          <Textarea
            id="cv-interests"
            rows={3}
            value={draft.interests}
            onChange={(event) =>
              onChange((current) => ({ ...current, interests: event.target.value }))
            }
          />
        </Field>
      </SectionCard>

      <SectionCard
        description="Une ligne par compétence pour préserver un rendu ATS lisible."
        title="Compétences"
      >
        <TextListField
          id="cv-hard-skills"
          label="Compétences techniques"
          value={draft.skills.hard}
          onChange={(value) => updateSkills("hard", value)}
        />
        <TextListField
          id="cv-soft-skills"
          label="Compétences transverses"
          value={draft.skills.soft}
          onChange={(value) => updateSkills("soft", value)}
        />
      </SectionCard>

      <SectionCard
        description="Expériences générées par l'IA, modifiables avant export."
        title="Expériences"
      >
        <EntryList
          entries={draft.experiences}
          render={(experience: ExperienceItemProps, index) => (
            <div key={`${experience.company}-${index}`} style={{ display: "grid", gap: "0.75rem" }}>
              <Field id={`cv-exp-position-${index}`} label="Poste">
                <Input
                  id={`cv-exp-position-${index}`}
                  value={experience.position}
                  onChange={(event) =>
                    updateArrayEntry<ExperienceItemProps>("experiences", index, {
                      position: event.target.value,
                    })
                  }
                />
              </Field>
              <Field id={`cv-exp-company-${index}`} label="Entreprise">
                <Input
                  id={`cv-exp-company-${index}`}
                  value={experience.company}
                  onChange={(event) =>
                    updateArrayEntry<ExperienceItemProps>("experiences", index, {
                      company: event.target.value,
                    })
                  }
                />
              </Field>
              <Field id={`cv-exp-description-${index}`} label="Description">
                <Textarea
                  id={`cv-exp-description-${index}`}
                  rows={3}
                  value={experience.description}
                  onChange={(event) =>
                    updateArrayEntry<ExperienceItemProps>("experiences", index, {
                      description: event.target.value,
                    })
                  }
                />
              </Field>
              <TextListField
                id={`cv-exp-achievements-${index}`}
                label="Réalisations"
                value={experience.achievements}
                onChange={(achievements) =>
                  updateArrayEntry<ExperienceItemProps>("experiences", index, {
                    achievements,
                  })
                }
              />
            </div>
          )}
        />
      </SectionCard>

      <SectionCard description="Formation et certifications clés." title="Formation">
        <EntryList
          entries={draft.education}
          render={(education: EducationItemProps, index) => (
            <div key={`${education.institution}-${index}`} style={{ display: "grid", gap: "0.75rem" }}>
              <Field id={`cv-edu-degree-${index}`} label="Diplôme">
                <Input
                  id={`cv-edu-degree-${index}`}
                  value={education.degree}
                  onChange={(event) =>
                    updateArrayEntry<EducationItemProps>("education", index, {
                      degree: event.target.value,
                    })
                  }
                />
              </Field>
              <Field id={`cv-edu-description-${index}`} label="Description">
                <Textarea
                  id={`cv-edu-description-${index}`}
                  rows={3}
                  value={education.description}
                  onChange={(event) =>
                    updateArrayEntry<EducationItemProps>("education", index, {
                      description: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
          )}
        />
        <EntryList
          entries={draft.certifications}
          render={(certification: CertificationItemProps, index) => (
            <Field
              id={`cv-cert-title-${index}`}
              key={`${certification.title}-${index}`}
              label="Certification"
            >
              <Input
                id={`cv-cert-title-${index}`}
                value={certification.title}
                onChange={(event) =>
                  updateArrayEntry<CertificationItemProps>("certifications", index, {
                    title: event.target.value,
                  })
                }
              />
            </Field>
          )}
        />
      </SectionCard>

      <SectionCard description="Langues et projets affichés en fin de CV." title="Compléments">
        <EntryList
          entries={draft.languages}
          render={(language: LanguageItemProps, index) => (
            <Field
              id={`cv-language-${index}`}
              key={`${language.language}-${index}`}
              label="Langue"
            >
              <Input
                id={`cv-language-${index}`}
                value={`${language.language} - ${language.level}`}
                onChange={(event) => {
                  const [languageName = "", level = ""] = event.target.value.split(" - ");
                  updateArrayEntry<LanguageItemProps>("languages", index, {
                    language: languageName,
                    level,
                  });
                }}
              />
            </Field>
          )}
        />
        <EntryList
          entries={draft.projects}
          render={(project: ProjectItemProps, index) => (
            <Field
              id={`cv-project-${index}`}
              key={`${project.title}-${index}`}
              label="Projet"
            >
              <Textarea
                id={`cv-project-${index}`}
                rows={3}
                value={`${project.title}\n${project.description}`}
                onChange={(event) => {
                  const [title = "", ...description] = event.target.value.split("\n");
                  updateArrayEntry<ProjectItemProps>("projects", index, {
                    description: description.join("\n"),
                    title,
                  });
                }}
              />
            </Field>
          )}
        />
      </SectionCard>
    </div>
  );
}
