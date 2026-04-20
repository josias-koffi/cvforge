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
import type { PuckData } from "@cvforge/types";
import { PuckCvEditorLoader } from "./puck-cv-editor-loader";

type CvEditorProps = {
  applicationId: string;
  puckData: PuckData;
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

export function CvEditor({ applicationId, puckData }: CvEditorProps) {
  const [dlStatus, setDlStatus] = useState<"idle" | "downloading" | "error">(
    "idle",
  );
  const [dlMessage, setDlMessage] = useState<string | null>(null);
  const config = toPuckConfig(documentBlockRegistry, "cv");

  async function downloadPdf() {
    setDlStatus("downloading");
    setDlMessage(null);

    try {
      const response = await fetch(`/cv/${applicationId}/pdf`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload.message ?? "L'export PDF a échoué.");
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/pdf")) {
        throw new Error("Le service a retourné un contenu non PDF.");
      }

      const pdf = await response.blob();
      const objectUrl = window.URL.createObjectURL(pdf);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = resolveDownloadFilename(
        response.headers.get("content-disposition"),
        applicationId,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);

      setDlStatus("idle");
      setDlMessage("Le PDF a été téléchargé.");
    } catch (error) {
      setDlStatus("error");
      setDlMessage(
        error instanceof Error ? error.message : "L'export PDF a échoué.",
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
              onClick={() => void downloadPdf()}
              type="button"
              variant="secondary"
            >
              {dlStatus === "downloading"
                ? "Préparation du PDF…"
                : "Télécharger le PDF"}
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
