"use client";

import React from "react";
import {
  Badge,
  Button,
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
  CVDocumentContent,
  CertificationItemProps,
  EducationItemProps,
  ExperienceItemProps,
  LanguageItemProps,
  ProjectItemProps,
} from "@cvforge/types";
import { CvDocumentPreview } from "./cv-document-preview";

type CvEditorProps = {
  applicationId: string;
  cvContent: CVDocumentContent;
};

function createEmptyExperience(): ExperienceItemProps {
  return {
    achievements: [],
    company: "",
    description: "",
    endDate: "",
    position: "",
    startDate: "",
  };
}

function createEmptyEducation(): EducationItemProps {
  return {
    degree: "",
    institution: "",
    mention: "",
    year: "",
  };
}

function createEmptyCertification(): CertificationItemProps {
  return {
    issuer: "",
    title: "",
    year: "",
  };
}

function createEmptyLanguage(): LanguageItemProps {
  return {
    language: "",
    level: "",
  };
}

function createEmptyProject(): ProjectItemProps {
  return {
    description: "",
    title: "",
    url: "",
  };
}

function splitCommaList(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function joinCommaList(values: string[]) {
  return values.join(", ");
}

function splitBulletList(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function joinBulletList(values: string[]) {
  return values.join("\n");
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

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: "0.4rem" }}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function CvEditor({ applicationId, cvContent }: CvEditorProps) {
  const [draft, setDraft] = React.useState<CVDocumentContent>(cvContent);
  const [status, setStatus] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  function updateCandidateField(
    field: keyof CVDocumentContent["candidate"],
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      candidate: {
        ...current.candidate,
        [field]: value,
      },
    }));
  }

  function updateExperience(
    index: number,
    field: "company" | "description" | "endDate" | "position" | "startDate",
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      experiences: current.experiences.map((experience, experienceIndex) =>
        experienceIndex === index
          ? { ...experience, [field]: value }
          : experience,
      ),
    }));
  }

  function updateExperienceAchievements(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      experiences: current.experiences.map((experience, experienceIndex) =>
        experienceIndex === index
          ? { ...experience, achievements: splitBulletList(value) }
          : experience,
      ),
    }));
  }

  function updateEducation(
    index: number,
    field: keyof EducationItemProps,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      education: current.education.map((education, educationIndex) =>
        educationIndex === index ? { ...education, [field]: value } : education,
      ),
    }));
  }

  function updateCertification(
    index: number,
    field: keyof CertificationItemProps,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      certifications: current.certifications.map(
        (certification, certificationIndex) =>
          certificationIndex === index
            ? { ...certification, [field]: value }
            : certification,
      ),
    }));
  }

  function updateLanguage(
    index: number,
    field: keyof LanguageItemProps,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      languages: current.languages.map((language, languageIndex) =>
        languageIndex === index ? { ...language, [field]: value } : language,
      ),
    }));
  }

  function updateProject(
    index: number,
    field: keyof ProjectItemProps,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      projects: current.projects.map((project, projectIndex) =>
        projectIndex === index ? { ...project, [field]: value } : project,
      ),
    }));
  }

  async function saveCvContent() {
    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch(`/cv/${applicationId}/save`, {
        body: JSON.stringify({ cvContent: draft }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload.message ?? "La sauvegarde du CV a echoue.");
      }

      const payload = (await response.json()) as {
        cvContent?: CVDocumentContent;
      };
      if (payload.cvContent) {
        setDraft(payload.cvContent);
      }

      setStatus("saved");
      setMessage("Les modifications du CV ont ete enregistrees.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "La sauvegarde du CV a echoue.",
      );
    }
  }

  return (
    <section
      aria-label="Editeur du CV"
      style={{ display: "grid", gap: "1rem" }}
    >
      <Card>
        <CardHeader>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <CardTitle>Edition WYSIWYG du CV</CardTitle>
              <CardDescription>
                Les modifications restent dans la structure documentaire
                partagee et restent compatibles avec le rendu PDF.
              </CardDescription>
            </div>
            <Badge style={{ backgroundColor: "#C8A96E", color: "#1A1A18" }}>
              Lecture seule sur mobile
            </Badge>
          </div>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "0.75rem" }}>
          <p style={{ color: "#6B6860", lineHeight: 1.65, margin: 0 }}>
            L&apos;edition est disponible sur ecran large. Sur mobile, le CV
            reste consultable en lecture seule pour garder une experience stable
            et lisible.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Button
              disabled={status === "saving"}
              onClick={() => void saveCvContent()}
              type="button"
            >
              {status === "saving"
                ? "Enregistrement…"
                : "Enregistrer les modifications"}
            </Button>
            <Button
              onClick={() => setDraft(cvContent)}
              type="button"
              variant="secondary"
            >
              Revenir au CV genere
            </Button>
          </div>
          {message ? (
            <p
              aria-live="polite"
              style={{
                backgroundColor: status === "error" ? "#FBEAE7" : "#EDF4EE",
                border: `1px solid ${status === "error" ? "#E5B8AF" : "#C9DCCF"}`,
                borderRadius: "0.75rem",
                color: status === "error" ? "#8A2C20" : "#30543A",
                lineHeight: 1.6,
                margin: 0,
                padding: "0.9rem 1rem",
              }}
            >
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="cvforge-cv-editor__mobile-only">
        <CvDocumentPreview cvContent={draft} />
      </div>

      <div className="cvforge-cv-editor__desktop-only cvforge-cv-editor__split">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionCard
            title="Identité"
            description="Les coordonnées locales sont réinjectées dans le CV sans modifier la structure exportable."
          >
            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <Field id="cv-firstName" label="Prénom">
                <Input
                  id="cv-firstName"
                  onChange={(event) =>
                    updateCandidateField("firstName", event.target.value)
                  }
                  value={draft.candidate.firstName}
                />
              </Field>
              <Field id="cv-lastName" label="Nom">
                <Input
                  id="cv-lastName"
                  onChange={(event) =>
                    updateCandidateField("lastName", event.target.value)
                  }
                  value={draft.candidate.lastName}
                />
              </Field>
              <Field id="cv-title" label="Titre professionnel">
                <Input
                  id="cv-title"
                  onChange={(event) =>
                    updateCandidateField("title", event.target.value)
                  }
                  value={draft.candidate.title}
                />
              </Field>
              <Field id="cv-city" label="Ville">
                <Input
                  id="cv-city"
                  onChange={(event) =>
                    updateCandidateField("city", event.target.value)
                  }
                  value={draft.candidate.city}
                />
              </Field>
              <Field id="cv-email" label="Email">
                <Input
                  id="cv-email"
                  onChange={(event) =>
                    updateCandidateField("email", event.target.value)
                  }
                  type="email"
                  value={draft.candidate.email}
                />
              </Field>
              <Field id="cv-phone" label="Téléphone">
                <Input
                  id="cv-phone"
                  onChange={(event) =>
                    updateCandidateField("phone", event.target.value)
                  }
                  type="tel"
                  value={draft.candidate.phone}
                />
              </Field>
              <Field id="cv-linkedin" label="LinkedIn">
                <Input
                  id="cv-linkedin"
                  onChange={(event) =>
                    updateCandidateField("linkedin", event.target.value)
                  }
                  value={draft.candidate.linkedin}
                />
              </Field>
              <Field id="cv-github" label="GitHub">
                <Input
                  id="cv-github"
                  onChange={(event) =>
                    updateCandidateField("github", event.target.value)
                  }
                  value={draft.candidate.github}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Accroche"
            description="Le résumé du candidat reste le bloc éditable central du CV."
          >
            <Field id="cv-summary" label="Résumé">
              <Textarea
                id="cv-summary"
                onChange={(event) =>
                  updateCandidateField("summary", event.target.value)
                }
                rows={5}
                value={draft.candidate.summary}
              />
            </Field>
          </SectionCard>

          <SectionCard
            title="Compétences"
            description="Séparez les compétences par une virgule ou un retour à la ligne."
          >
            <div style={{ display: "grid", gap: "1rem" }}>
              <Field id="cv-hard-skills" label="Hard skills">
                <Textarea
                  id="cv-hard-skills"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      skills: {
                        ...current.skills,
                        hard: splitCommaList(event.target.value),
                      },
                    }))
                  }
                  rows={4}
                  value={joinCommaList(draft.skills.hard)}
                />
              </Field>
              <Field id="cv-soft-skills" label="Soft skills">
                <Textarea
                  id="cv-soft-skills"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      skills: {
                        ...current.skills,
                        soft: splitCommaList(event.target.value),
                      },
                    }))
                  }
                  rows={4}
                  value={joinCommaList(draft.skills.soft)}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Expériences"
            description="Chaque carte correspond à un bloc d'expérience du document."
          >
            {draft.experiences.map((experience, index) => (
              <Card key={`${experience.company}-${index}`}>
                <CardHeader>
                  <CardTitle>Expérience {index + 1}</CardTitle>
                </CardHeader>
                <CardContent style={{ display: "grid", gap: "1rem" }}>
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    <Field id={`cv-exp-position-${index}`} label="Poste">
                      <Input
                        id={`cv-exp-position-${index}`}
                        onChange={(event) =>
                          updateExperience(
                            index,
                            "position",
                            event.target.value,
                          )
                        }
                        value={experience.position}
                      />
                    </Field>
                    <Field id={`cv-exp-company-${index}`} label="Entreprise">
                      <Input
                        id={`cv-exp-company-${index}`}
                        onChange={(event) =>
                          updateExperience(index, "company", event.target.value)
                        }
                        value={experience.company}
                      />
                    </Field>
                    <Field id={`cv-exp-start-${index}`} label="Début">
                      <Input
                        id={`cv-exp-start-${index}`}
                        onChange={(event) =>
                          updateExperience(
                            index,
                            "startDate",
                            event.target.value,
                          )
                        }
                        value={experience.startDate}
                      />
                    </Field>
                    <Field id={`cv-exp-end-${index}`} label="Fin">
                      <Input
                        id={`cv-exp-end-${index}`}
                        onChange={(event) =>
                          updateExperience(index, "endDate", event.target.value)
                        }
                        value={experience.endDate}
                      />
                    </Field>
                  </div>
                  <Field id={`cv-exp-description-${index}`} label="Description">
                    <Textarea
                      id={`cv-exp-description-${index}`}
                      onChange={(event) =>
                        updateExperience(
                          index,
                          "description",
                          event.target.value,
                        )
                      }
                      rows={4}
                      value={experience.description}
                    />
                  </Field>
                  <Field id={`cv-exp-achievements-${index}`} label="Réussites">
                    <Textarea
                      id={`cv-exp-achievements-${index}`}
                      onChange={(event) =>
                        updateExperienceAchievements(index, event.target.value)
                      }
                      rows={4}
                      value={joinBulletList(experience.achievements)}
                    />
                  </Field>
                  <Button
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        experiences: current.experiences.filter(
                          (_, experienceIndex) => experienceIndex !== index,
                        ),
                      }))
                    }
                    type="button"
                    variant="ghost"
                  >
                    Retirer cette expérience
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Button
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  experiences: [
                    ...current.experiences,
                    createEmptyExperience(),
                  ],
                }))
              }
              type="button"
              variant="secondary"
            >
              Ajouter une expérience
            </Button>
          </SectionCard>

          <SectionCard
            title="Formations"
            description="Un bloc par ligne de formation."
          >
            {draft.education.map((education, index) => (
              <Card key={`${education.institution}-${index}`}>
                <CardHeader>
                  <CardTitle>Formation {index + 1}</CardTitle>
                </CardHeader>
                <CardContent style={{ display: "grid", gap: "1rem" }}>
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    <Field id={`cv-edu-degree-${index}`} label="Diplôme">
                      <Input
                        id={`cv-edu-degree-${index}`}
                        onChange={(event) =>
                          updateEducation(index, "degree", event.target.value)
                        }
                        value={education.degree}
                      />
                    </Field>
                    <Field
                      id={`cv-edu-institution-${index}`}
                      label="Établissement"
                    >
                      <Input
                        id={`cv-edu-institution-${index}`}
                        onChange={(event) =>
                          updateEducation(
                            index,
                            "institution",
                            event.target.value,
                          )
                        }
                        value={education.institution}
                      />
                    </Field>
                    <Field id={`cv-edu-year-${index}`} label="Année">
                      <Input
                        id={`cv-edu-year-${index}`}
                        onChange={(event) =>
                          updateEducation(index, "year", event.target.value)
                        }
                        value={education.year}
                      />
                    </Field>
                    <Field id={`cv-edu-mention-${index}`} label="Mention">
                      <Input
                        id={`cv-edu-mention-${index}`}
                        onChange={(event) =>
                          updateEducation(index, "mention", event.target.value)
                        }
                        value={education.mention}
                      />
                    </Field>
                  </div>
                  <Button
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        education: current.education.filter(
                          (_, educationIndex) => educationIndex !== index,
                        ),
                      }))
                    }
                    type="button"
                    variant="ghost"
                  >
                    Retirer cette formation
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Button
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  education: [...current.education, createEmptyEducation()],
                }))
              }
              type="button"
              variant="secondary"
            >
              Ajouter une formation
            </Button>
          </SectionCard>

          <SectionCard
            title="Certifications"
            description="Bloc ATS optionnel à conserver compatible export."
          >
            {draft.certifications.map((certification, index) => (
              <Card key={`${certification.title}-${index}`}>
                <CardHeader>
                  <CardTitle>Certification {index + 1}</CardTitle>
                </CardHeader>
                <CardContent style={{ display: "grid", gap: "1rem" }}>
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    <Field id={`cv-cert-title-${index}`} label="Titre">
                      <Input
                        id={`cv-cert-title-${index}`}
                        onChange={(event) =>
                          updateCertification(
                            index,
                            "title",
                            event.target.value,
                          )
                        }
                        value={certification.title}
                      />
                    </Field>
                    <Field id={`cv-cert-issuer-${index}`} label="Organisme">
                      <Input
                        id={`cv-cert-issuer-${index}`}
                        onChange={(event) =>
                          updateCertification(
                            index,
                            "issuer",
                            event.target.value,
                          )
                        }
                        value={certification.issuer}
                      />
                    </Field>
                    <Field id={`cv-cert-year-${index}`} label="Année">
                      <Input
                        id={`cv-cert-year-${index}`}
                        onChange={(event) =>
                          updateCertification(index, "year", event.target.value)
                        }
                        value={certification.year}
                      />
                    </Field>
                  </div>
                  <Button
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        certifications: current.certifications.filter(
                          (_, certificationIndex) =>
                            certificationIndex !== index,
                        ),
                      }))
                    }
                    type="button"
                    variant="ghost"
                  >
                    Retirer cette certification
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Button
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  certifications: [
                    ...current.certifications,
                    createEmptyCertification(),
                  ],
                }))
              }
              type="button"
              variant="secondary"
            >
              Ajouter une certification
            </Button>
          </SectionCard>

          <SectionCard
            title="Langues"
            description="Conservez les niveaux lisibles pour les scanners ATS."
          >
            {draft.languages.map((language, index) => (
              <Card key={`${language.language}-${index}`}>
                <CardHeader>
                  <CardTitle>Langue {index + 1}</CardTitle>
                </CardHeader>
                <CardContent style={{ display: "grid", gap: "1rem" }}>
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    <Field id={`cv-lang-name-${index}`} label="Langue">
                      <Input
                        id={`cv-lang-name-${index}`}
                        onChange={(event) =>
                          updateLanguage(index, "language", event.target.value)
                        }
                        value={language.language}
                      />
                    </Field>
                    <Field id={`cv-lang-level-${index}`} label="Niveau">
                      <Input
                        id={`cv-lang-level-${index}`}
                        onChange={(event) =>
                          updateLanguage(index, "level", event.target.value)
                        }
                        value={language.level}
                      />
                    </Field>
                  </div>
                  <Button
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        languages: current.languages.filter(
                          (_, languageIndex) => languageIndex !== index,
                        ),
                      }))
                    }
                    type="button"
                    variant="ghost"
                  >
                    Retirer cette langue
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Button
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  languages: [...current.languages, createEmptyLanguage()],
                }))
              }
              type="button"
              variant="secondary"
            >
              Ajouter une langue
            </Button>
          </SectionCard>

          <SectionCard
            title="Projets"
            description="Utilisez des projets courts et lisibles en PDF."
          >
            {draft.projects.map((project, index) => (
              <Card key={`${project.title}-${index}`}>
                <CardHeader>
                  <CardTitle>Projet {index + 1}</CardTitle>
                </CardHeader>
                <CardContent style={{ display: "grid", gap: "1rem" }}>
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    <Field id={`cv-project-title-${index}`} label="Titre">
                      <Input
                        id={`cv-project-title-${index}`}
                        onChange={(event) =>
                          updateProject(index, "title", event.target.value)
                        }
                        value={project.title}
                      />
                    </Field>
                    <Field id={`cv-project-url-${index}`} label="Lien">
                      <Input
                        id={`cv-project-url-${index}`}
                        onChange={(event) =>
                          updateProject(index, "url", event.target.value)
                        }
                        value={project.url}
                      />
                    </Field>
                  </div>
                  <Field
                    id={`cv-project-description-${index}`}
                    label="Description"
                  >
                    <Textarea
                      id={`cv-project-description-${index}`}
                      onChange={(event) =>
                        updateProject(index, "description", event.target.value)
                      }
                      rows={4}
                      value={project.description}
                    />
                  </Field>
                  <Button
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        projects: current.projects.filter(
                          (_, projectIndex) => projectIndex !== index,
                        ),
                      }))
                    }
                    type="button"
                    variant="ghost"
                  >
                    Retirer ce projet
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Button
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  projects: [...current.projects, createEmptyProject()],
                }))
              }
              type="button"
              variant="secondary"
            >
              Ajouter un projet
            </Button>
          </SectionCard>
        </div>

        <div
          className="cvforge-cv-editor__preview-panel"
          style={{ display: "grid", gap: "1rem" }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Aperçu live</CardTitle>
              <CardDescription>
                Le rendu réutilise les mêmes blocs documentaires que
                l&apos;export.
              </CardDescription>
            </CardHeader>
          </Card>
          <CvDocumentPreview cvContent={draft} />
        </div>
      </div>
    </section>
  );
}
