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
