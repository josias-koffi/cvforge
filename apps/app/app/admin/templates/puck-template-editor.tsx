"use client";

import React from "react";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import type { Data } from "@puckeditor/core";
import { toPuckConfig, documentBlockRegistry } from "@cvforge/ui";
import type { PuckData, TemplateKind } from "@cvforge/types";
import { useState } from "react";

export interface PuckTemplateEditorProps {
  templateId: string;
  kind: TemplateKind;
  initialData: PuckData;
}

export function PuckTemplateEditor({
  templateId,
  kind,
  initialData,
}: PuckTemplateEditorProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const config = toPuckConfig(documentBlockRegistry, kind);

  async function handlePublish(data: Data) {
    setStatus("saving");
    try {
      const response = await fetch("/admin/templates/publish-layout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId, layout: data }),
      });
      setStatus(response.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      {status === "saved" ? (
        <p style={{ color: "#4A7C59", margin: "0 0 0.75rem" }}>
          Layout enregistré avec succès.
        </p>
      ) : null}
      {status === "error" ? (
        <p style={{ color: "#C0392B", margin: "0 0 0.75rem" }}>
          Erreur lors de l&apos;enregistrement du layout.
        </p>
      ) : null}
      <div style={{ minHeight: "70vh", position: "relative" }}>
        <Puck
          config={config}
          data={initialData as Data}
          onPublish={handlePublish}
        />
      </div>
    </div>
  );
}
