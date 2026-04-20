"use client";

import React from "react";
import { Button } from "@cvforge/ui";

type DeleteFormProps = {
  templateId: string;
  templateName: string;
};

export function DeleteForm({ templateId, templateName }: DeleteFormProps) {
  return (
    <form
      action="/admin/templates/delete"
      method="post"
      onSubmit={(e) => {
        if (!window.confirm(`Supprimer « ${templateName} » ? Cette action est irréversible.`)) {
          e.preventDefault();
        }
      }}
    >
      <input name="templateId" type="hidden" value={templateId} />
      <Button
        type="submit"
        variant="ghost"
        style={{ color: "#C0392B", fontSize: "0.8125rem", padding: "0.25rem 0.625rem" }}
        aria-label={`Supprimer ${templateName}`}
      >
        Supprimer
      </Button>
    </form>
  );
}
