"use client";

import React from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@cvforge/ui";
import type { ImportedCvExtractionResult } from "@cvforge/types";
import {
  applyImportedCvProfilePatch,
  getActiveProfile,
  loadProfileRegistryFromStorage,
  saveProfileRegistryToStorage,
} from "./base-profile";

function getStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

function countImportedSections(result: ImportedCvExtractionResult) {
  const sections = result.extractedProfile.sections;

  return [
    result.extractedProfile.headline,
    sections.summary,
    sections.experiences.length,
    sections.education.length,
    sections.technicalSkills.length,
    sections.softSkills.length,
    sections.certifications.length,
    sections.personalProjects.length,
  ].filter(Boolean).length;
}

export function CvImportPanel({ sessionEmail }: { sessionEmail: string }) {
  const [state, setState] = React.useState<"idle" | "loading" | "ready" | "saved" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportedCvExtractionResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage(null);
    setResult(null);

    const response = await fetch("/profile/import-cv", {
      body: new FormData(event.currentTarget),
      method: "POST",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setState("error");
      setMessage(payload.message ?? "L'import du CV a echoue.");
      return;
    }

    setResult((await response.json()) as ImportedCvExtractionResult);
    setState("ready");
  }

  function applyToActiveProfile() {
    if (!result) {
      return;
    }

    const storage = getStorage();
    const registry = loadProfileRegistryFromStorage(sessionEmail, storage);
    const activeProfile = getActiveProfile(registry);
    const importedProfile = applyImportedCvProfilePatch(
      activeProfile,
      result.extractedProfile,
    );

    saveProfileRegistryToStorage(
      {
        ...registry,
        profiles: registry.profiles.map((profile) =>
          profile.id === activeProfile.id ? importedProfile : profile,
        ),
      },
      storage,
    );
    setState("saved");
    setMessage("Profil actif pre-rempli. Relisez les champs extraits avant de continuer.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importer un CV existant</CardTitle>
        <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
          Importez un PDF ou DOCX pour pre-remplir le profil actif. Les champs
          directement identifiants sont retires avant l'appel IA.
        </p>
      </CardHeader>
      <CardContent style={{ display: "grid", gap: "1rem" }}>
        <form onSubmit={(event) => void handleSubmit(event)} style={{ display: "grid", gap: "0.875rem" }}>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <Label htmlFor="cvFile">Fichier CV</Label>
            <Input
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              id="cvFile"
              name="cvFile"
              required
              type="file"
            />
          </div>
          <Button disabled={state === "loading"} type="submit">
            {state === "loading" ? "Extraction en cours..." : "Extraire le profil"}
          </Button>
        </form>

        <div
          style={{
            backgroundColor: "#FAFAF7",
            border: "1px solid #D9D4CA",
            borderRadius: "0.875rem",
            color: "#6B6860",
            lineHeight: 1.6,
            padding: "1rem",
          }}
        >
          <strong style={{ color: "#1A1A18" }}>Limites de qualite</strong>
          <p style={{ margin: "0.35rem 0 0" }}>
            Les PDF scannes, les mises en page multi-colonnes, les tableaux et les
            icones peuvent produire une extraction incomplete. Validez toujours les
            experiences, dates, competences et niveaux de langue avant sauvegarde.
          </p>
        </div>

        {message ? (
          <p
            role={state === "error" ? "alert" : "status"}
            style={{
              backgroundColor: state === "error" ? "#FBEAE7" : "#EDF7F0",
              border: `1px solid ${state === "error" ? "#E5B8AF" : "#BFD8C7"}`,
              borderRadius: "0.75rem",
              color: state === "error" ? "#8A2C20" : "#2F5D3A",
              lineHeight: 1.6,
              margin: 0,
              padding: "0.75rem 1rem",
            }}
          >
            {message}
          </p>
        ) : null}

        {result && state !== "saved" ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <p style={{ color: "#1A1A18", margin: 0 }}>
              Extraction prete: {countImportedSections(result)} zones detectees depuis{" "}
              {result.source.filename}.
            </p>
            <ul style={{ color: "#6B6860", lineHeight: 1.6, margin: 0, paddingLeft: "1.25rem" }}>
              {result.qualityLimits.map((limit) => (
                <li key={limit}>{limit}</li>
              ))}
            </ul>
            <Button onClick={applyToActiveProfile} type="button">
              Appliquer au profil actif
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
