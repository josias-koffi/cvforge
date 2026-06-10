"use client";

import React, { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cvforge/ui";
import type { CVDocumentContent, CVDocumentVersionEntry } from "@cvforge/types";
import { CvDocumentPreview } from "./cv-document-preview";
import { CvEditorFields } from "./cv-editor-fields";

type CvEditorProps = {
  applicationId: string;
  cvContent: CVDocumentContent;
  versions?: CVDocumentVersionEntry[];
};

function resolveDownloadFilename(
  contentDisposition: string | null,
  applicationId: string,
) {
  if (!contentDisposition) return `cv-${applicationId}.pdf`;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  return filenameMatch?.[1] ?? `cv-${applicationId}.pdf`;
}

function fallbackFilename(applicationId: string, format: "docx" | "pdf") {
  return `cv-${applicationId}.${format}`;
}

export function CvEditor({
  applicationId,
  cvContent,
  versions = [],
}: CvEditorProps) {
  const [draft, setDraft] = useState(cvContent);
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "downloading" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function saveCv() {
    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch(`/cv/${applicationId}/save`, {
        body: JSON.stringify({ cvContent: draft }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        cvContent?: CVDocumentContent;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "La sauvegarde du CV a échoué.");
      }

      if (payload.cvContent) {
        setDraft(payload.cvContent);
      }

      setStatus("saved");
      setMessage(payload.message ?? "CV sauvegardé.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "La sauvegarde du CV a échoué.",
      );
    }
  }

  async function downloadDocument(format: "docx" | "pdf") {
    setStatus("downloading");
    setMessage(null);

    try {
      const response = await fetch(`/cv/${applicationId}/${format}`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(
          payload.message ?? `L'export ${format.toUpperCase()} a échoué.`,
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (format === "pdf" && !contentType.includes("application/pdf")) {
        throw new Error("Le service a retourné un contenu non PDF.");
      }
      if (
        format === "docx" &&
        !contentType.includes(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
      ) {
        throw new Error("Le service a retourné un contenu non DOCX.");
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
        link.download = fallbackFilename(applicationId, format);
      }
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);

      setStatus("saved");
      setMessage(`Le ${format.toUpperCase()} a été téléchargé.`);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : `L'export ${format.toUpperCase()} a échoué.`,
      );
    }
  }

  return (
    <section
      aria-label="Editeur du CV"
      style={{ display: "grid", gap: "1.5rem" }}
    >
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
          <h2 style={{ margin: 0 }}>Edition WYSIWYG du CV</h2>
          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            Modifiez les champs nécessaires, puis contrôlez immédiatement le
            rendu ATS dans l'aperçu.
          </p>
        </div>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          {status === "saved" ? <Badge>Sauvegardé</Badge> : null}
          <Button
            disabled={status === "saving" || status === "downloading"}
            onClick={() => setDraft(cvContent)}
            type="button"
            variant="ghost"
          >
            Réinitialiser
          </Button>
          <Button
            disabled={status === "saving" || status === "downloading"}
            onClick={() => void saveCv()}
            type="button"
            variant="secondary"
          >
            {status === "saving" ? "Sauvegarde…" : "Sauvegarder le CV"}
          </Button>
          <Button
            disabled={status === "saving" || status === "downloading"}
            onClick={() => void downloadDocument("pdf")}
            type="button"
          >
            {status === "downloading"
              ? "Téléchargement…"
              : "Télécharger le PDF"}
          </Button>
          <Button
            disabled={status === "saving" || status === "downloading"}
            onClick={() => void downloadDocument("docx")}
            type="button"
            variant="secondary"
          >
            {status === "downloading"
              ? "Téléchargement…"
              : "Télécharger le DOCX"}
          </Button>
        </div>
      </div>

      {message ? (
        <p
          aria-live="polite"
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

      <details>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          Historique des versions ({versions.length})
        </summary>
        <Card style={{ marginTop: "0.75rem" }}>
          <CardHeader>
            <CardTitle>Historique des versions CV</CardTitle>
            <CardDescription>
              Chaque génération et chaque sauvegarde créent une version
              horodatée.
            </CardDescription>
          </CardHeader>
          <CardContent>
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

      <div className="cvforge-cv-editor__split">
        <CvEditorFields draft={draft} onChange={setDraft} />
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            position: "sticky",
            top: "4.5rem",
          }}
        >
          <h3 style={{ margin: 0 }}>Aperçu live</h3>
          <CvDocumentPreview cvContent={draft} />
        </div>
      </div>
    </section>
  );
}
