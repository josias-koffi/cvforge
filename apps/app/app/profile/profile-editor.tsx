"use client";

import React from "react";
import { Button } from "@cvforge/ui";
import {
  countCompletedProfileSections,
  createEmptyCertification,
  createEmptyEducation,
  createEmptyExperience,
  createEmptyProfileRegistry,
  createEmptyProject,
  loadProfileRegistryFromStorage,
  saveProfileRegistryToStorage,
  splitListInput,
  joinListInput,
  touchBaseProfile,
  type BaseProfile,
  type BaseProfileRegistry,
  type CertificationEntry,
  type EducationEntry,
  type ExperienceEntry,
  type ProjectEntry,
} from "./base-profile";
import {
  CertificationFields,
  EducationFields,
  ExperienceFields,
  LabeledInput,
  LabeledTextarea,
  ProjectFields,
  SectionCard,
} from "./profile-entry-fields";

/* v8 ignore start -- static profile editor markup is covered by page-level render tests; profile state lives in base-profile.ts */
function getStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
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

export function ProfileEditor({
  profileId,
  sessionEmail,
}: {
  profileId: string;
  sessionEmail: string;
}) {
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

  const profile = registry.profiles.find((p) => p.id === profileId) ?? registry.profiles[0];

  if (!profile) {
    return null;
  }

  const completedSections = countCompletedProfileSections(profile);

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
        identity: { ...current.identity, [field]: value },
      }));
    },
    [updateProfile],
  );

  const updateHeadline = React.useCallback(
    (value: string) => updateProfile((current) => ({ ...current, headline: value })),
    [updateProfile],
  );

  const updateLabel = React.useCallback(
    (value: string) => updateProfile((current) => ({ ...current, label: value })),
    [updateProfile],
  );

  const updateTextSection = React.useCallback(
    (field: "summary" | "interests", value: string) => {
      updateProfile((current) => ({
        ...current,
        sections: { ...current.sections, [field]: value },
      }));
    },
    [updateProfile],
  );

  const updateListSection = React.useCallback(
    (field: "technicalSkills" | "softSkills", value: string) => {
      updateProfile((current) => ({
        ...current,
        sections: { ...current.sections, [field]: splitListInput(value) },
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
          [key]: current.sections[key].map((entry, i) => (i === index ? value : entry)),
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
          [key]: current.sections[key].filter((_, i) => i !== index),
        },
      }));
    },
    [updateProfile],
  );

  return (
    <section aria-label="Edition du profil" style={{ display: "grid", gap: "1rem" }}>
      <p style={{ color: "#6B6860", fontSize: "0.9rem", margin: 0 }}>
        {completedSections} / 9 sections renseignees
      </p>

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
        <LabeledInput id="profile-headline" label="Titre professionnel" onChange={updateHeadline} value={profile.headline} />
      </SectionCard>

      <SectionCard
        title="Accroche / Summary"
        description="Resume libre pour introduire le profil, ses forces et ses objectifs."
      >
        <LabeledTextarea id="profile-summary" label="Summary" onChange={(value) => updateTextSection("summary", value)} rows={5} value={profile.sections.summary} />
      </SectionCard>

      <SectionCard title="Experiences professionnelles" description="Poste, entreprise, periode, missions et resultats chiffres.">
        {profile.sections.experiences.map((experience, index) => (
          <ExperienceFields
            experience={experience}
            index={index}
            key={`experience-${profile.id}-${index}`}
            onChange={(value) => updateEntry<ExperienceEntry>("experiences", index, value)}
            onRemove={() => removeEntry("experiences", index)}
          />
        ))}
        <Button onClick={() => addEntry("experiences")} type="button">Ajouter une experience</Button>
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
        <Button onClick={() => addEntry("education")} type="button">Ajouter une formation</Button>
      </SectionCard>

      <SectionCard title="Competences techniques" description="Liste libre des hard skills, separees par des virgules.">
        <LabeledTextarea id="profile-technical-skills" label="Competences techniques" onChange={(value) => updateListSection("technicalSkills", value)} rows={4} value={joinListInput(profile.sections.technicalSkills)} />
      </SectionCard>

      <SectionCard title="Competences humaines" description="Liste libre des soft skills, separees par des virgules.">
        <LabeledTextarea id="profile-soft-skills" label="Competences humaines" onChange={(value) => updateListSection("softSkills", value)} rows={4} value={joinListInput(profile.sections.softSkills)} />
      </SectionCard>

      <SectionCard title="Certifications" description="Titre, organisme et annee.">
        {profile.sections.certifications.map((certification, index) => (
          <CertificationFields
            certification={certification}
            index={index}
            key={`certification-${profile.id}-${index}`}
            onChange={(value) => updateEntry<CertificationEntry>("certifications", index, value)}
            onRemove={() => removeEntry("certifications", index)}
          />
        ))}
        <Button onClick={() => addEntry("certifications")} type="button">Ajouter une certification</Button>
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
        <Button onClick={() => addEntry("personalProjects")} type="button">Ajouter un projet</Button>
      </SectionCard>

      <SectionCard title="Loisirs / Centres d'interet" description="Champ libre pour les activites ou centres d'interet a mettre en avant.">
        <LabeledTextarea id="profile-interests" label="Centres d'interet" onChange={(value) => updateTextSection("interests", value)} rows={4} value={profile.sections.interests} />
      </SectionCard>
    </section>
  );
}
/* v8 ignore stop */
