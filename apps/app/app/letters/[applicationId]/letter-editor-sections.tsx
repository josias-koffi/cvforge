"use client";

import React from "react";
import {
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
  LetterDocumentContent,
  LetterDocumentVersionEntry,
} from "@cvforge/types";
import { LetterDocumentPreview } from "./letter-document-preview";

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

export function LetterRegenerationPanel({
  message,
  onRegenerate,
  onRefinementChange,
  refinement,
  status,
}: {
  message: string | null;
  onRegenerate: () => void;
  onRefinementChange: (value: string) => void;
  refinement: string;
  status: "idle" | "loading" | "error";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Régénérer la LM</CardTitle>
        <CardDescription>
          Précisez uniquement ce qui doit changer dans la prochaine version.
        </CardDescription>
      </CardHeader>
      <CardContent style={{ display: "grid", gap: "0.75rem" }}>
        <Field id="letter-refinement" label="Raffinement (optionnel)">
          <Textarea
            id="letter-refinement"
            maxLength={500}
            onChange={(event) => onRefinementChange(event.target.value)}
            placeholder="Ex. : insister sur mon expérience open-source…"
            rows={3}
            value={refinement}
          />
        </Field>
        <div style={{ alignItems: "center", display: "flex", gap: "0.75rem" }}>
          <Button
            disabled={status === "loading"}
            onClick={onRegenerate}
            type="button"
            variant="secondary"
          >
            {status === "loading"
              ? "Régénération en cours…"
              : "Régénérer la LM"}
          </Button>
          <span style={{ color: "#6B6860", fontSize: "0.75rem" }}>
            {refinement.length} / 500
          </span>
        </div>
        {message ? (
          <p
            style={{
              backgroundColor: status === "error" ? "#FBEAE7" : "#EEF6ED",
              border: `1px solid ${status === "error" ? "#E5B8AF" : "#BFD6BF"}`,
              borderRadius: "0.75rem",
              color: status === "error" ? "#8A2C20" : "#2F5E3C",
              margin: 0,
              padding: "0.75rem 1rem",
            }}
          >
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function LetterVersionHistory({
  versions,
}: {
  versions: LetterDocumentVersionEntry[];
}) {
  return (
    <details>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>
        Historique des versions LM ({versions.length})
      </summary>
      <Card style={{ marginTop: "0.75rem" }}>
        <CardContent style={{ paddingTop: "1rem" }}>
          {versions.length === 0 ? (
            <p style={{ color: "#6B6860", margin: 0 }}>
              Aucune version historisée.
            </p>
          ) : (
            <ol style={{ display: "grid", gap: "0.5rem", margin: 0 }}>
              {versions.map((version) => (
                <li key={version.id}>
                  Version {version.versionNumber} -{" "}
                  {version.source === "generation"
                    ? "génération"
                    : "sauvegarde"}{" "}
                  - {new Date(version.createdAt).toLocaleString("fr-FR")}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </details>
  );
}

export function LetterEditorWorkspace({
  draft,
  onChange,
}: {
  draft: LetterDocumentContent;
  onChange: React.Dispatch<React.SetStateAction<LetterDocumentContent>>;
}) {
  function updateCandidate(
    field: keyof LetterDocumentContent["candidate"],
    value: string,
  ) {
    onChange((current) => ({
      ...current,
      candidate: { ...current.candidate, [field]: value },
      signature:
        field === "firstName" || field === "lastName"
          ? { ...current.signature, [field]: value }
          : current.signature,
    }));
  }

  function updateBody(
    field: keyof LetterDocumentContent["body"],
    value: string,
  ) {
    onChange((current) => ({
      ...current,
      body: { ...current.body, [field]: value || undefined },
    }));
  }

  return (
    <div className="cvforge-cv-editor__split">
      <div style={{ display: "grid", gap: "1rem" }}>
        <SectionCard
          description="Coordonnées du candidat et destinataire."
          title="En-tête"
        >
          {(
            [
              ["firstName", "Prénom"],
              ["lastName", "Nom"],
              ["title", "Titre"],
            ] as const
          ).map(([field, label]) => (
            <Field id={`candidate-${field}`} key={field} label={label}>
              <Input
                id={`candidate-${field}`}
                onChange={(event) => updateCandidate(field, event.target.value)}
                value={draft.candidate[field]}
              />
            </Field>
          ))}
          <Field id="company-name" label="Entreprise">
            <Input
              id="company-name"
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  company: { ...current.company, name: event.target.value },
                }))
              }
              value={draft.company.name}
            />
          </Field>
          <Field id="company-city" label="Ville entreprise">
            <Input
              id="company-city"
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  company: { ...current.company, city: event.target.value },
                }))
              }
              value={draft.company.city}
            />
          </Field>
          <Field id="letter-date" label="Date">
            <Input
              id="letter-date"
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
              value={draft.date}
            />
          </Field>
          <Field id="letter-object" label="Objet">
            <Input
              id="letter-object"
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  object: event.target.value,
                }))
              }
              value={draft.object}
            />
          </Field>
        </SectionCard>

        <SectionCard
          description="Quatre paragraphes courts pour une lecture rapide."
          title="Corps"
        >
          {(
            [
              ["paragraph1", "Paragraphe 1", 4],
              ["paragraph2", "Paragraphe 2", 5],
              ["paragraph3", "Paragraphe 3", 4],
              ["paragraph4", "Conclusion", 4],
            ] as const
          ).map(([field, label, rows]) => (
            <Field id={field} key={field} label={label}>
              <Textarea
                id={field}
                onChange={(event) => updateBody(field, event.target.value)}
                rows={rows}
                value={draft.body[field] ?? ""}
              />
            </Field>
          ))}
        </SectionCard>
      </div>

      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          position: "sticky",
          top: "4.5rem",
        }}
      >
        <h3 style={{ margin: 0 }}>Aperçu PDF</h3>
        <LetterDocumentPreview letterContent={draft} />
      </div>
    </div>
  );
}
