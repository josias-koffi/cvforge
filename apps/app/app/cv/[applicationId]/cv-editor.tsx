"use client";

import React, { useState } from "react";
import { Render } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  toPuckConfig,
  documentBlockRegistry,
} from "@cvforge/ui";
import type { CVDocumentVersionEntry, PuckData } from "@cvforge/types";
import { PuckCvEditorLoader } from "./puck-cv-editor-loader";

type CvEditorProps = {
  applicationId: string;
  puckData: PuckData;
  versions: CVDocumentVersionEntry[];
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

export function CvEditor({ applicationId, puckData, versions }: CvEditorProps) {
  const documentVersions = versions ?? [];
  const [dlStatus, setDlStatus] = useState<"idle" | "downloading" | "error">(
    "idle",
  );
  const [dlMessage, setDlMessage] = useState<string | null>(null);
  const config = toPuckConfig(documentBlockRegistry, "cv");

  async function downloadDocument(format: "docx" | "pdf") {
    setDlStatus("downloading");
    setDlMessage(null);

    try {
      const response = await fetch(`/cv/${applicationId}/${format}`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload.message ?? `L'export ${format.toUpperCase()} a échoué.`);
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

      setDlStatus("idle");
      setDlMessage(`Le ${format.toUpperCase()} a été téléchargé.`);
    } catch (error) {
      setDlStatus("error");
      setDlMessage(
        error instanceof Error
          ? error.message
          : `L'export ${format.toUpperCase()} a échoué.`,
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
              <CardTitle>Edition du CV par contenu</CardTitle>
              <CardDescription>
                Modifiez les valeurs de chaque bloc. La structure reste
                compatible avec l&apos;export PDF.
              </CardDescription>
            </div>
            <Badge style={{ backgroundColor: "#C8A96E", color: "#1A1A18" }}>
              Lecture seule sur mobile
            </Badge>
          </div>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "0.75rem" }}>
          <p style={{ color: "#6B6860", lineHeight: 1.65, margin: 0 }}>
            L&apos;édition est disponible sur écran large. Sur mobile, le CV
            reste consultable en lecture seule pour garder une expérience stable
            et lisible. Cliquez sur &ldquo;Publier&rdquo; dans l&apos;éditeur
            pour enregistrer vos modifications.
          </p>
          <div>
            <Button
              disabled={dlStatus === "downloading"}
              onClick={() => void downloadDocument("pdf")}
              type="button"
              variant="secondary"
            >
              {dlStatus === "downloading"
                ? "Préparation du PDF…"
                : "Télécharger le PDF"}
            </Button>
            <Button
              disabled={dlStatus === "downloading"}
              onClick={() => void downloadDocument("docx")}
              type="button"
            >
              {dlStatus === "downloading"
                ? "Préparation du DOCX…"
                : "Télécharger le DOCX"}
            </Button>
          </div>
          {dlMessage ? (
            <p
              aria-live="polite"
              style={{
                backgroundColor: dlStatus === "error" ? "#FBEAE7" : "#EDF4EE",
                border: `1px solid ${dlStatus === "error" ? "#E5B8AF" : "#C9DCCF"}`,
                borderRadius: "0.75rem",
                color: dlStatus === "error" ? "#8A2C20" : "#30543A",
                lineHeight: 1.6,
                margin: 0,
                padding: "0.9rem 1rem",
              }}
            >
              {dlMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des versions CV</CardTitle>
          <CardDescription>
            Chaque génération et chaque publication enregistrée crée une version
            horodatée.
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

      <div className="cvforge-cv-editor__mobile-only">
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #D9D4CA",
            borderRadius: "1rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            display: "grid",
            fontFamily: '"EB Garamond", "Libre Baskerville", Georgia, serif',
            gap: "1rem",
            padding: "1.5rem",
          }}
        >
          <Render config={config} data={puckData as Data} />
        </div>
      </div>

      <div className="cvforge-cv-editor__desktop-only">
        <PuckCvEditorLoader applicationId={applicationId} initialData={puckData} />
      </div>
    </section>
  );
}
