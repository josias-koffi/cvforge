"use client";

import React from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@cvforge/ui";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
} from "./base-profile";

/* v8 ignore start -- static field components covered by page-level render tests */

export function SectionCard({
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

export function LabeledInput({
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

export function LabeledTextarea({
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

export function ExperienceFields({
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

export function EducationFields({
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
        <LabeledTextarea
          id={`education-description-${index}`}
          label="Description de la formation"
          onChange={(value) => onChange({ ...education, description: value })}
          rows={3}
          value={education.description}
        />
        <Button onClick={onRemove} type="button" variant="ghost">
          Retirer cette formation
        </Button>
      </CardContent>
    </Card>
  );
}

export function CertificationFields({
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

export function ProjectFields({
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

/* v8 ignore stop */
