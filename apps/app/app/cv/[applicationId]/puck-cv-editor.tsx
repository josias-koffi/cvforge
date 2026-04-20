"use client";

import React, { useState } from "react";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import type { Data } from "@puckeditor/core";
import { toPuckConfig, documentBlockRegistry } from "@cvforge/ui";
import type { PuckData } from "@cvforge/types";
import { puckDataToCvContent } from "./puck-data-to-cv-content";

export interface PuckCvEditorProps {
  applicationId: string;
  initialData: PuckData;
}

export function PuckCvEditor({ applicationId, initialData }: PuckCvEditorProps) {
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const config = toPuckConfig(documentBlockRegistry, "cv");

  async function handlePublish(data: Data) {
    setSaveStatus("saving");
    setSaveMessage(null);

    try {
      const cvContent = puckDataToCvContent(data as PuckData);
      const response = await fetch(`/cv/${applicationId}/save`, {
        body: JSON.stringify({ cvContent }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload.message ?? "La sauvegarde du CV a échoué.");
      }

      setSaveStatus("saved");
      setSaveMessage("Les modifications du CV ont été enregistrées.");
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "La sauvegarde du CV a échoué.",
      );
    }
  }

  return (
    <div>
      {saveMessage ? (
        <p
          aria-live="polite"
          style={{
            backgroundColor: saveStatus === "error" ? "#FBEAE7" : "#EDF4EE",
            border: `1px solid ${saveStatus === "error" ? "#E5B8AF" : "#C9DCCF"}`,
            borderRadius: "0.75rem",
            color: saveStatus === "error" ? "#8A2C20" : "#30543A",
            lineHeight: 1.6,
            margin: "0 0 1rem",
            padding: "0.9rem 1rem",
          }}
        >
          {saveMessage}
        </p>
      ) : null}
      <div style={{ minHeight: "70vh" }}>
        <Puck
          config={config}
          data={initialData as Data}
          onPublish={(data) => void handlePublish(data)}
          permissions={{
            delete: false,
            drag: false,
            duplicate: false,
            insert: false,
          }}
        />
      </div>
    </div>
  );
}
