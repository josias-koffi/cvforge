"use client";

import React from "react";
import { Label } from "@cvforge/ui";
import {
  getSelectedProfileIdForApplication,
  loadApplicationProfileSelection,
  loadProfileRegistryFromStorage,
  saveApplicationProfileSelection,
} from "../profile/base-profile";

function getStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

export function ApplicationProfileSelector({
  applicationId,
  sessionEmail,
}: {
  applicationId: string;
  sessionEmail: string;
}) {
  const [options, setOptions] = React.useState<Array<{ id: string; label: string }>>([]);
  const [value, setValue] = React.useState("");
  const [hasContent, setHasContent] = React.useState(true);

  React.useEffect(() => {
    const storage = getStorage();
    const registry = loadProfileRegistryFromStorage(sessionEmail, storage);
    const selection = loadApplicationProfileSelection(storage);
    const selectedProfileId = getSelectedProfileIdForApplication(
      applicationId,
      registry,
      selection,
    );

    setOptions(
      registry.profiles.map((profile) => ({
        id: profile.id,
        label: profile.label || profile.identity.email,
      })),
    );
    setValue(selectedProfileId);
    setHasContent(registry.profiles.some((p) => p.identity.firstName.trim() !== ""));
  }, [applicationId, sessionEmail]);

  function handleChange(nextValue: string) {
    setValue(nextValue);

    const storage = getStorage();
    const selection = loadApplicationProfileSelection(storage);

    saveApplicationProfileSelection(
      {
        ...selection,
        [applicationId]: nextValue,
      },
      storage,
    );
  }

  if (!hasContent) {
    return (
      <p
        style={{
          backgroundColor: "#FDF6E3",
          border: "1px solid #DCC7A0",
          borderRadius: "0.75rem",
          color: "#7A5A26",
          lineHeight: 1.6,
          margin: 0,
          padding: "0.75rem 1rem",
        }}
      >
        Aucun profil configuré.{" "}
        <a href="/profile" style={{ color: "#7A5A26", fontWeight: 600 }}>
          Créez votre profil →
        </a>{" "}
        avant de générer un CV.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.4rem" }}>
      <Label htmlFor={`application-profile-${applicationId}`}>
        Profil actif pour cette candidature
      </Label>
      <select
        id={`application-profile-${applicationId}`}
        onChange={(event) => handleChange(event.target.value)}
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #D9D4CA",
          borderRadius: "0.75rem",
          color: "#1A1A18",
          minHeight: "2.75rem",
          padding: "0.75rem 0.9rem",
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <p style={{ color: "#6B6860", lineHeight: 1.5, margin: 0 }}>
        Ce choix est memorise localement et sera reutilise pour les futures generations
        de CV et de lettre sur cette candidature.
      </p>
    </div>
  );
}
