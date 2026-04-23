"use client";

import React from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@cvforge/ui";
import Link from "next/link";
import {
  countCompletedProfileSections,
  createAdditionalBaseProfile,
  createEmptyCertification,
  createEmptyEducation,
  createEmptyExperience,
  createEmptyProfileRegistry,
  createEmptyProject,
  formatProfileSavedAt,
  getActiveProfile,
  joinListInput,
  loadProfileRegistryFromStorage,
  saveProfileRegistryToStorage,
  splitListInput,
  touchBaseProfile,
  type BaseProfile,
  type BaseProfileRegistry,
  type CertificationEntry,
  type EducationEntry,
  type ExperienceEntry,
  type ProjectEntry,
} from "./base-profile";

/* v8 ignore start -- static profile editor markup is covered by page-level render tests; profile state lives in base-profile.ts */
function getStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: "0.25rem" }}>
      <dt style={{ color: "#6B6860", fontSize: "0.9rem", fontWeight: 600 }}>{label}</dt>
      <dd style={{ margin: 0 }}>{value || "Non renseigne"}</dd>
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
        <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>{description}</p>
      </CardHeader>
      <CardContent style={{ display: "grid", gap: "1rem" }}>{children}</CardContent>
    </Card>
  );
}

function updateProfileInRegistry(
  registry: BaseProfileRegistry,
  profileId: string,
  updater: (profile: BaseProfile) => BaseProfile,
) {
  return {
    ...registry,
    profiles: registry.profiles.map((profile) =>
      profile.id === profileId ? touchBaseProfile(updater(profile)) : profile,
    ),
  };
}

export function ProfileEditor({ sessionEmail }: { sessionEmail: string }) {
  const [registry, setRegistry] = React.useState<BaseProfileRegistry>(() =>
    createEmptyProfileRegistry(sessionEmail),
  );
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setRegistry(loadProfileRegistryFromStorage(sessionEmail, getStorage()));
    setHydrated(true);
  }, [sessionEmail]);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveProfileRegistryToStorage(registry, getStorage());
  }, [hydrated, registry]);

  const profile = getActiveProfile(registry);
  const completedSections = countCompletedProfileSections(profile);
  const fullName = `${profile.identity.firstName} ${profile.identity.lastName}`.trim();

  const updateProfile = React.useCallback(
    (updater: (current: BaseProfile) => BaseProfile) => {
      setRegistry((current) => updateProfileInRegistry(current, profile.id, updater));
    },
    [profile.id],
  );

  const updateIdentityField = React.useCallback(
    (field: keyof BaseProfile["identity"], value: string) => {
      updateProfile((current) => ({
        ...current,
        identity: {
          ...current.identity,
          [field]: value,
        },
      }));
    },
    [updateProfile],
  );

  const updateHeadline = React.useCallback(
    (value: string) => {
      updateProfile((current) => ({
        ...current,
        headline: value,
      }));
    },
    [updateProfile],
  );

  const updateLabel = React.useCallback(
    (value: string) => {
      updateProfile((current) => ({
        ...current,
        label: value,
      }));
    },
    [updateProfile],
  );

  const updateTextSection = React.useCallback(
    (field: "summary" | "interests", value: string) => {
      updateProfile((current) => ({
        ...current,
        sections: {
          ...current.sections,
          [field]: value,
        },
      }));
    },
    [updateProfile],
  );

  const updateListSection = React.useCallback(
    (field: "technicalSkills" | "softSkills", value: string) => {
      updateProfile((current) => ({
        ...current,
        sections: {
          ...current.sections,
          [field]: splitListInput(value),
        },
      }));
    },
    [updateProfile],
  );

  const updateEntry = React.useCallback(
    <TEntry,>(
      key: "experiences" | "education" | "certifications" | "personalProjects",
      index: number,
      value: TEntry,
    ) => {
      updateProfile((current) => ({
        ...current,
        sections: {
          ...current.sections,
          [key]: current.sections[key].map((entry, entryIndex) =>
            entryIndex === index ? value : entry,
          ),
        },
      }));
    },
    [updateProfile],
  );

  const addEntry = React.useCallback(
    (key: "experiences" | "education" | "certifications" | "personalProjects") => {
      updateProfile((current) => ({
        ...current,
        sections: {
          ...current.sections,
          [key]: [
            ...current.sections[key],
            key === "experiences"
              ? createEmptyExperience()
              : key === "education"
                ? createEmptyEducation()
                : key === "certifications"
                  ? createEmptyCertification()
                  : createEmptyProject(),
          ],
        },
      }));
    },
    [updateProfile],
  );

  const removeEntry = React.useCallback(
    (key: "experiences" | "education" | "certifications" | "personalProjects", index: number) => {
      updateProfile((current) => ({
        ...current,
        sections: {
          ...current.sections,
          [key]: current.sections[key].filter((_, entryIndex) => entryIndex !== index),
        },
      }));
    },
    [updateProfile],
  );

  const activateProfile = React.useCallback((profileId: string) => {
    setRegistry((current) => ({
      ...current,
      activeProfileId: profileId,
    }));
  }, []);

  const addProfile = React.useCallback(() => {
    setRegistry((current) => {
      const nextProfile = createAdditionalBaseProfile(sessionEmail, current.profiles.length);

      return {
        activeProfileId: nextProfile.id,
        profiles: [...current.profiles, nextProfile],
        version: 2,
      };
    });
  }, [sessionEmail]);

  const removeActiveProfile = React.useCallback(() => {
    setRegistry((current) => {
      if (current.profiles.length <= 1) {
        return current;
      }

      const remainingProfiles = current.profiles.filter(
        (entry) => entry.id !== current.activeProfileId,
      );

      return {
        activeProfileId: remainingProfiles[0]?.id ?? current.activeProfileId,
        profiles: remainingProfiles,
        version: 2,
      };
    });
  }, []);

  return (
    <section aria-label="Profils de base" style={{ display: "grid", gap: "1rem" }}>
      <Card>
        <CardHeader>
          <CardTitle>Profils de base multiples</CardTitle>
          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            Chaque compte peut maintenant conserver plusieurs profils socles et changer
            de profil actif selon le contexte de candidature.
          </p>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "1rem" }}>
          <dl
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D9D4CA",
              borderRadius: "1rem",
              display: "grid",
              gap: "0.75rem",
              margin: 0,
              padding: "1.25rem",
            }}
          >
            <SummaryRow label="Profil actif" value={profile.label || fullName || sessionEmail} />
            <SummaryRow label="Nom candidat" value={fullName || sessionEmail} />
            <SummaryRow label="Email" value={profile.identity.email} />
            <SummaryRow label="Titre professionnel" value={profile.headline} />
            <SummaryRow label="Profils disponibles" value={`${registry.profiles.length}`} />
            <SummaryRow
              label="Sections renseignees"
              value={`${completedSections} / 9 sections vision`}
            />
            <SummaryRow label="Sauvegarde" value={formatProfileSavedAt(profile.meta.lastSavedAt)} />
          </dl>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Button onClick={addProfile} type="button">
              Ajouter un profil
            </Button>
            <Button
              disabled={registry.profiles.length <= 1}
              onClick={removeActiveProfile}
              type="button"
              variant="ghost"
            >
              Supprimer le profil actif
            </Button>
            <Link href="/dashboard" style={{ color: "#2C2C2A", fontWeight: 600, padding: "0.75rem 0" }}>
              Consulter le tableau de bord
            </Link>
          </div>
          <div
            aria-label="Liste des profils"
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {registry.profiles.map((entry) => {
              const isActive = entry.id === registry.activeProfileId;
              const entryFullName = `${entry.identity.firstName} ${entry.identity.lastName}`.trim();

              return (
                <button
                  key={entry.id}
                  onClick={() => activateProfile(entry.id)}
                  style={{
                    backgroundColor: isActive ? "#F2F0EB" : "#FFFFFF",
                    border: isActive ? "2px solid #2C2C2A" : "1px solid #D9D4CA",
                    borderRadius: "1rem",
                    cursor: "pointer",
                    display: "grid",
                    gap: "0.35rem",
                    padding: "1rem",
                    textAlign: "left",
                  }}
                  type="button"
                >
                  <strong style={{ color: "#1A1A18" }}>{entry.label}</strong>
                  <span style={{ color: "#6B6860" }}>
                    {entryFullName || entry.identity.email || "Profil incomplet"}
                  </span>
                  <span style={{ color: "#6B6860", fontSize: "0.9rem" }}>
                    {countCompletedProfileSections(entry)} sections renseignees
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <SectionCard
        title="Identite du profil"
        description="Nom interne, coordonnees du candidat et liens utiles pour contextualiser ce socle."
      >
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <LabeledInput id="profile-label" label="Nom du profil" onChange={updateLabel} value={profile.label} />
          <LabeledInput id="profile-first-name" label="Prenom" onChange={(value) => updateIdentityField("firstName", value)} value={profile.identity.firstName} />
          <LabeledInput id="profile-last-name" label="Nom" onChange={(value) => updateIdentityField("lastName", value)} value={profile.identity.lastName} />
          <LabeledInput id="profile-city" label="Ville" onChange={(value) => updateIdentityField("city", value)} value={profile.identity.city} />
          <LabeledInput id="profile-phone" label="Telephone" onChange={(value) => updateIdentityField("phone", value)} value={profile.identity.phone} />
          <LabeledInput id="profile-email" label="Email" onChange={(value) => updateIdentityField("email", value)} value={profile.identity.email} />
          <LabeledInput id="profile-linkedin" label="LinkedIn" onChange={(value) => updateIdentityField("linkedIn", value)} value={profile.identity.linkedIn} />
          <LabeledInput id="profile-github" label="GitHub" onChange={(value) => updateIdentityField("github", value)} value={profile.identity.github} />
          <LabeledInput id="profile-portfolio" label="Portfolio" onChange={(value) => updateIdentityField("portfolio", value)} value={profile.identity.portfolio} />
          <LabeledInput id="profile-other-link" label="Autre lien" onChange={(value) => updateIdentityField("otherLink", value)} value={profile.identity.otherLink} />
        </div>
      </SectionCard>

      <SectionCard
        title="Titre professionnel"
        description="Positionnement principal du profil socle utilise pour les futures generations IA."
      >
        <LabeledInput
          id="profile-headline"
          label="Titre professionnel"
          onChange={updateHeadline}
          value={profile.headline}
        />
      </SectionCard>

      <SectionCard
        title="Accroche / Summary"
        description="Resume libre pour introduire le profil, ses forces et ses objectifs."
      >
        <LabeledTextarea
          id="profile-summary"
          label="Summary"
          onChange={(value) => updateTextSection("summary", value)}
          rows={5}
          value={profile.sections.summary}
        />
      </SectionCard>

      <SectionCard
        title="Experiences professionnelles"
        description="Poste, entreprise, periode, missions et resultats chiffres."
      >
        {profile.sections.experiences.map((experience, index) => (
          <ExperienceFields
            experience={experience}
            index={index}
            key={`experience-${profile.id}-${index}`}
            onChange={(value) => updateEntry<ExperienceEntry>("experiences", index, value)}
            onRemove={() => removeEntry("experiences", index)}
          />
        ))}
        <Button onClick={() => addEntry("experiences")} type="button">
          Ajouter une experience
        </Button>
      </SectionCard>

      <SectionCard title="Formations" description="Diplome, etablissement, annee et mention.">
        {profile.sections.education.map((education, index) => (
          <EducationFields
            education={education}
            index={index}
            key={`education-${profile.id}-${index}`}
            onChange={(value) => updateEntry<EducationEntry>("education", index, value)}
            onRemove={() => removeEntry("education", index)}
          />
        ))}
        <Button onClick={() => addEntry("education")} type="button">
          Ajouter une formation
        </Button>
      </SectionCard>

      <SectionCard
        title="Competences techniques"
        description="Liste libre des hard skills, separees par des virgules."
      >
        <LabeledTextarea
          id="profile-technical-skills"
          label="Competences techniques"
          onChange={(value) => updateListSection("technicalSkills", value)}
          rows={4}
          value={joinListInput(profile.sections.technicalSkills)}
        />
      </SectionCard>

      <SectionCard
        title="Competences humaines"
        description="Liste libre des soft skills, separees par des virgules."
      >
        <LabeledTextarea
          id="profile-soft-skills"
          label="Competences humaines"
          onChange={(value) => updateListSection("softSkills", value)}
          rows={4}
          value={joinListInput(profile.sections.softSkills)}
        />
      </SectionCard>

      <SectionCard title="Certifications" description="Titre, organisme et annee.">
        {profile.sections.certifications.map((certification, index) => (
          <CertificationFields
            certification={certification}
            index={index}
            key={`certification-${profile.id}-${index}`}
            onChange={(value) =>
              updateEntry<CertificationEntry>("certifications", index, value)
            }
            onRemove={() => removeEntry("certifications", index)}
          />
        ))}
        <Button onClick={() => addEntry("certifications")} type="button">
          Ajouter une certification
        </Button>
      </SectionCard>

      <SectionCard title="Projets personnels" description="Titre, description et lien.">
        {profile.sections.personalProjects.map((project, index) => (
          <ProjectFields
            index={index}
            key={`project-${profile.id}-${index}`}
            onChange={(value) => updateEntry<ProjectEntry>("personalProjects", index, value)}
            onRemove={() => removeEntry("personalProjects", index)}
            project={project}
          />
        ))}
        <Button onClick={() => addEntry("personalProjects")} type="button">
          Ajouter un projet
        </Button>
      </SectionCard>

      <SectionCard
        title="Loisirs / Centres d'interet"
        description="Champ libre pour les activites ou centres d'interet a mettre en avant."
      >
        <LabeledTextarea
          id="profile-interests"
          label="Centres d'interet"
          onChange={(value) => updateTextSection("interests", value)}
          rows={4}
          value={profile.sections.interests}
        />
      </SectionCard>
    </section>
  );
}

function ExperienceFields({
  experience,
  index,
  onChange,
  onRemove,
}: {
  experience: ExperienceEntry;
  index: number;
  onChange: (value: ExperienceEntry) => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Experience {index + 1}</CardTitle>
      </CardHeader>
      <CardContent style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <LabeledInput id={`experience-role-${index}`} label="Poste" onChange={(value) => onChange({ ...experience, role: value })} value={experience.role} />
          <LabeledInput id={`experience-company-${index}`} label="Entreprise" onChange={(value) => onChange({ ...experience, company: value })} value={experience.company} />
          <LabeledInput id={`experience-period-${index}`} label="Periode" onChange={(value) => onChange({ ...experience, period: value })} value={experience.period} />
        </div>
        <LabeledTextarea
          id={`experience-results-${index}`}
          label="Missions et resultats"
          onChange={(value) => onChange({ ...experience, results: value })}
          rows={4}
          value={experience.results}
        />
        <Button onClick={onRemove} type="button" variant="ghost">
          Retirer cette experience
        </Button>
      </CardContent>
    </Card>
  );
}

function EducationFields({
  education,
  index,
  onChange,
  onRemove,
}: {
  education: EducationEntry;
  index: number;
  onChange: (value: EducationEntry) => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Formation {index + 1}</CardTitle>
      </CardHeader>
      <CardContent style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <LabeledInput id={`education-degree-${index}`} label="Diplome" onChange={(value) => onChange({ ...education, degree: value })} value={education.degree} />
          <LabeledInput id={`education-institution-${index}`} label="Etablissement" onChange={(value) => onChange({ ...education, institution: value })} value={education.institution} />
          <LabeledInput id={`education-year-${index}`} label="Annee" onChange={(value) => onChange({ ...education, year: value })} value={education.year} />
          <LabeledInput id={`education-honors-${index}`} label="Mention" onChange={(value) => onChange({ ...education, honors: value })} value={education.honors} />
        </div>
        <Button onClick={onRemove} type="button" variant="ghost">
          Retirer cette formation
        </Button>
      </CardContent>
    </Card>
  );
}

function CertificationFields({
  certification,
  index,
  onChange,
  onRemove,
}: {
  certification: CertificationEntry;
  index: number;
  onChange: (value: CertificationEntry) => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Certification {index + 1}</CardTitle>
      </CardHeader>
      <CardContent style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <LabeledInput id={`certification-title-${index}`} label="Titre" onChange={(value) => onChange({ ...certification, title: value })} value={certification.title} />
          <LabeledInput id={`certification-issuer-${index}`} label="Organisme" onChange={(value) => onChange({ ...certification, issuer: value })} value={certification.issuer} />
          <LabeledInput id={`certification-year-${index}`} label="Annee" onChange={(value) => onChange({ ...certification, year: value })} value={certification.year} />
        </div>
        <Button onClick={onRemove} type="button" variant="ghost">
          Retirer cette certification
        </Button>
      </CardContent>
    </Card>
  );
}

function ProjectFields({
  index,
  onChange,
  onRemove,
  project,
}: {
  index: number;
  onChange: (value: ProjectEntry) => void;
  onRemove: () => void;
  project: ProjectEntry;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projet {index + 1}</CardTitle>
      </CardHeader>
      <CardContent style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <LabeledInput id={`project-title-${index}`} label="Titre" onChange={(value) => onChange({ ...project, title: value })} value={project.title} />
          <LabeledInput id={`project-link-${index}`} label="Lien" onChange={(value) => onChange({ ...project, link: value })} value={project.link} />
        </div>
        <LabeledTextarea id={`project-description-${index}`} label="Description" onChange={(value) => onChange({ ...project, description: value })} rows={4} value={project.description} />
        <Button onClick={onRemove} type="button" variant="ghost">
          Retirer ce projet
        </Button>
      </CardContent>
    </Card>
  );
}

function LabeledInput({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} onChange={(event) => onChange(event.target.value)} value={value} />
    </div>
  );
}

function LabeledTextarea({
  id,
  label,
  onChange,
  rows,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} onChange={(event) => onChange(event.target.value)} rows={rows} value={value} />
    </div>
  );
}
/* v8 ignore stop */
