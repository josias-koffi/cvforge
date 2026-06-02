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
import type { LetterDocumentContent, LetterGenerationRequest } from "@cvforge/types";
import type { LetterDocumentVersionEntry } from "@cvforge/types";
import {
  getProfileForApplication,
  loadApplicationProfileSelection,
  loadProfileRegistryFromStorage,
} from "../../profile/base-profile";
import { AI_CANDIDATE_TOKEN } from "../../profile/ai-prompt-profile";
import { LetterDocumentPreview } from "./letter-document-preview";

function resolveDownloadFilename(
  contentDisposition: string | null,
  applicationId: string,
) {
  if (!contentDisposition) {
    return `letter-${applicationId}.pdf`;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (filenameMatch?.[1]) {
    return filenameMatch[1];
  }

  return `letter-${applicationId}.pdf`;
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

export function LetterEditor({
  applicationId,
  letterContent,
  versions,
}: {
  applicationId: string;
  letterContent: LetterDocumentContent;
  versions: LetterDocumentVersionEntry[];
}) {
  const documentVersions = versions ?? [];
  const [draft, setDraft] = React.useState(letterContent);
  const [status, setStatus] = React.useState<
    "idle" | "saving" | "saved" | "downloading" | "error"
  >("idle");
  const [message, setMessage] = React.useState<string | null>(null);
  const [refinement, setRefinement] = React.useState("");
  const [regenStatus, setRegenStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [regenMessage, setRegenMessage] = React.useState<string | null>(null);

  function updateCandidate(
    field: keyof LetterDocumentContent["candidate"],
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      candidate: {
        ...current.candidate,
        [field]: value,
      },
      signature:
        field === "firstName" || field === "lastName"
          ? {
              ...current.signature,
              [field]: value,
            }
          : current.signature,
    }));
  }

  async function saveLetter() {
    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch(`/letters/${applicationId}/save`, {
        body: JSON.stringify({ letterContent: draft }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        letterContent?: LetterDocumentContent;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "La sauvegarde a échoué.");
      }

      if (payload.letterContent) {
        setDraft(payload.letterContent);
      }

      setStatus("saved");
      setMessage(payload.message ?? "LM sauvegardée.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "La sauvegarde de la LM a échoué.",
      );
    }
  }

  async function regenerateLetter() {
    setRegenStatus("loading");
    setRegenMessage(null);

    let requestBody: LetterGenerationRequest & { refinement?: string } = {
      localFields: { email: "", lastName: "", phone: "" },
      promptProfile: {
        headline: "",
        identity: { candidateToken: AI_CANDIDATE_TOKEN, city: "", firstName: "" },
        profileSections: {
          certifications: [],
          education: [],
          experiences: [],
          interests: "",
          personalProjects: [],
          softSkills: [],
          summary: "",
          technicalSkills: [],
        },
      },
    };

    try {
      const registry = loadProfileRegistryFromStorage(draft.candidate.email, localStorage);
      const selection = loadApplicationProfileSelection(localStorage);
      const profile = getProfileForApplication(applicationId, registry, selection);
      if (profile) {
        requestBody = {
          localFields: {
            email: profile.identity.email.trim(),
            lastName: profile.identity.lastName.trim(),
            phone: profile.identity.phone.trim(),
          },
          promptProfile: {
            headline: profile.headline.trim(),
            identity: {
              candidateToken: AI_CANDIDATE_TOKEN,
              city: profile.identity.city.trim(),
              firstName: profile.identity.firstName.trim(),
            },
            profileSections: profile.sections,
          },
        };
      }
    } catch {
      // use default empty payload if profile unavailable
    }

    const trimmedRefinement = refinement.trim();
    if (trimmedRefinement) {
      requestBody.refinement = trimmedRefinement;
    }

    try {
      const response = await fetch(`/letters/${applicationId}/regenerate`, {
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        letterContent?: LetterDocumentContent;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "La régénération a échoué.");
      }

      if (payload.letterContent) {
        setDraft(payload.letterContent);
      }

      setRegenStatus("idle");
      setRegenMessage("LM régénérée avec succès.");
      setRefinement("");
    } catch (error) {
      setRegenStatus("error");
      setRegenMessage(
        error instanceof Error ? error.message : "La régénération a échoué.",
      );
    }
  }

  async function downloadDocument(format: "docx" | "pdf") {
    setStatus("downloading");
    setMessage(null);

    try {
      const response = await fetch(`/letters/${applicationId}/${format}`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload.message ?? `L'export ${format.toUpperCase()} a echoue.`);
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (format === "pdf" && !contentType.includes("application/pdf")) {
        throw new Error("Le service a retourne un contenu non PDF.");
      }
      if (
        format === "docx" &&
        !contentType.includes(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
      ) {
        throw new Error("Le service a retourne un contenu non DOCX.");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = resolveDownloadFilename(
        response.headers.get("content-disposition"),
        applicationId,
      ).replace(/\.pdf$/i, `.${format}`);
      if (!response.headers.get("content-disposition")) {
        link.download = `letter-${applicationId}.${format}`;
      }
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);

      setStatus("saved");
      setMessage(`Le ${format.toUpperCase()} a ete telecharge.`);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : `L'export ${format.toUpperCase()} a echoue.`,
      );
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "grid", gap: "0.35rem" }}>
          <h2 style={{ margin: 0 }}>Edition WYSIWYG de la LM</h2>
          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            Template LM ATS par défaut, éditable avant validation finale.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {status === "saved" ? <Badge>Sauvegardée</Badge> : null}
          <Button
            disabled={status === "saving" || status === "downloading"}
            onClick={() => setDraft(letterContent)}
            type="button"
            variant="ghost"
          >
            Réinitialiser
          </Button>
          <Button
            disabled={status === "saving" || status === "downloading"}
            onClick={() => void saveLetter()}
            type="button"
            variant="secondary"
          >
            {status === "saving" ? "Sauvegarde…" : "Sauvegarder la LM"}
          </Button>
          <Button
            disabled={status === "saving" || status === "downloading"}
            onClick={() => void downloadDocument("pdf")}
            type="button"
          >
            {status === "downloading" ? "Téléchargement…" : "Telecharger le PDF"}
          </Button>
          <Button
            disabled={status === "saving" || status === "downloading"}
            onClick={() => void downloadDocument("docx")}
            type="button"
            variant="secondary"
          >
            {status === "downloading" ? "Téléchargement…" : "Telecharger le DOCX"}
          </Button>
        </div>
      </div>

      {message ? (
        <p
          style={{
            backgroundColor: status === "error" ? "#FBEAE7" : "#EEF6ED",
            border: `1px solid ${status === "error" ? "#E5B8AF" : "#BFD6BF"}`,
            borderRadius: "0.75rem",
            color: status === "error" ? "#8A2C20" : "#2F5E3C",
            lineHeight: 1.6,
            margin: 0,
            padding: "0.75rem 1rem",
          }}
        >
          {message}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Régénérer la LM</CardTitle>
          <CardDescription>
            Ajoutez un texte de raffinement pour enrichir la prochaine génération avec votre motivation spécifique.
          </CardDescription>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label
              htmlFor="letter-refinement"
              style={{ color: "#1A1A18", fontSize: "0.875rem", fontWeight: 500 }}
            >
              Raffinement <span style={{ color: "#6B6860", fontWeight: 400 }}>(optionnel)</span>
            </label>
            <Textarea
              id="letter-refinement"
              maxLength={500}
              placeholder="Ex. : Je suis particulièrement attiré par leur approche open-source…"
              rows={3}
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
            />
            <p style={{ color: "#6B6860", fontSize: "0.75rem", margin: 0, textAlign: "right" }}>
              {refinement.length} / 500
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Button
              disabled={regenStatus === "loading"}
              onClick={() => void regenerateLetter()}
              type="button"
              variant="secondary"
            >
              {regenStatus === "loading" ? "Régénération en cours…" : "Régénérer la LM"}
            </Button>
          </div>
          {regenMessage ? (
            <p
              style={{
                backgroundColor: regenStatus === "error" ? "#FBEAE7" : "#EEF6ED",
                border: `1px solid ${regenStatus === "error" ? "#E5B8AF" : "#BFD6BF"}`,
                borderRadius: "0.75rem",
                color: regenStatus === "error" ? "#8A2C20" : "#2F5E3C",
                lineHeight: 1.6,
                margin: 0,
                padding: "0.75rem 1rem",
              }}
            >
              {regenMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des versions LM</CardTitle>
          <CardDescription>
            Chaque génération et chaque sauvegarde créent une version horodatée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documentVersions.length === 0 ? (
            <p style={{ color: "#6B6860", margin: 0 }}>
              Aucune version historisée.
            </p>
          ) : (
            <ol style={{ display: "grid", gap: "0.5rem", margin: 0 }}>
              {documentVersions.map((version) => (
                <li key={version.id}>
                  Version {version.versionNumber} -{" "}
                  {version.source === "generation" ? "génération" : "sauvegarde"}{" "}
                  - {new Date(version.createdAt).toLocaleString("fr-FR")}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "minmax(0, 1fr)" }}>
        <div
          style={{
            display: "grid",
            gap: "1.5rem",
          }}
        >
          <div style={{ display: "grid", gap: "1.5rem" }}>
            <SectionCard
              description="Coordonnées réinjectées localement et destinataire de la candidature."
              title="En-tête"
            >
              <Field id="candidate-first-name" label="Prénom">
                <Input
                  id="candidate-first-name"
                  value={draft.candidate.firstName}
                  onChange={(event) => updateCandidate("firstName", event.target.value)}
                />
              </Field>
              <Field id="candidate-last-name" label="Nom">
                <Input
                  id="candidate-last-name"
                  value={draft.candidate.lastName}
                  onChange={(event) => updateCandidate("lastName", event.target.value)}
                />
              </Field>
              <Field id="candidate-title" label="Titre">
                <Input
                  id="candidate-title"
                  value={draft.candidate.title}
                  onChange={(event) => updateCandidate("title", event.target.value)}
                />
              </Field>
              <Field id="company-name" label="Entreprise">
                <Input
                  id="company-name"
                  value={draft.company.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      company: { ...current.company, name: event.target.value },
                    }))
                  }
                />
              </Field>
              <Field id="company-city" label="Ville entreprise">
                <Input
                  id="company-city"
                  value={draft.company.city}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      company: { ...current.company, city: event.target.value },
                    }))
                  }
                />
              </Field>
              <Field id="letter-date" label="Date">
                <Input
                  id="letter-date"
                  value={draft.date}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </Field>
              <Field id="letter-object" label="Objet">
                <Input
                  id="letter-object"
                  value={draft.object}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, object: event.target.value }))
                  }
                />
              </Field>
            </SectionCard>

            <SectionCard
              description="Structure narrative attendue pour le template LM ATS."
              title="Corps"
            >
              <Field id="paragraph-1" label="Paragraphe 1">
                <Textarea
                  id="paragraph-1"
                  rows={5}
                  value={draft.body.paragraph1}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      body: { ...current.body, paragraph1: event.target.value },
                    }))
                  }
                />
              </Field>
              <Field id="paragraph-2" label="Paragraphe 2">
                <Textarea
                  id="paragraph-2"
                  rows={6}
                  value={draft.body.paragraph2}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      body: { ...current.body, paragraph2: event.target.value },
                    }))
                  }
                />
              </Field>
              <Field id="paragraph-3" label="Paragraphe 3">
                <Textarea
                  id="paragraph-3"
                  rows={5}
                  value={draft.body.paragraph3}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      body: { ...current.body, paragraph3: event.target.value },
                    }))
                  }
                />
              </Field>
            </SectionCard>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lecture seule sur mobile</CardTitle>
              <CardDescription>
                L'edition detaillee reste prioritairement desktop. Vous pouvez relire la lettre ici avant de revenir sur un ecran plus large.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div style={{ display: "grid", gap: "0.75rem" }}>
          <h3 style={{ margin: 0 }}>Aperçu live</h3>
          <LetterDocumentPreview letterContent={draft} />
        </div>
      </div>
    </div>
  );
}
