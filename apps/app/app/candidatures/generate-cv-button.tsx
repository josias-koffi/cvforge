"use client";

import React, { useState } from "react";
import { Button } from "@cvforge/ui";
import {
  getProfileForApplication,
  loadApplicationProfileSelection,
  loadProfileRegistryFromStorage,
  type BaseProfile,
} from "../profile/base-profile";
import { AI_CANDIDATE_TOKEN } from "../profile/ai-prompt-profile";
import type { CvGenerationRequest } from "@cvforge/types";

type GenerateCvButtonProps = {
  applicationId: string;
  sessionEmail: string;
};

function buildRequest(profile: BaseProfile): Omit<CvGenerationRequest, never> {
  return {
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

export function GenerateCvButton({
  applicationId,
  sessionEmail,
}: GenerateCvButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setState("loading");
    setErrorMessage(null);

    let profile: BaseProfile | null = null;

    try {
      const registry = loadProfileRegistryFromStorage(sessionEmail, localStorage);
      const selection = loadApplicationProfileSelection(localStorage);
      profile = getProfileForApplication(applicationId, registry, selection);
    } catch {
      // ignore parse errors
    }

    if (!profile || !profile.identity.firstName.trim()) {
      setState("error");
      setErrorMessage(
        "Le profil selectionne est vide. Renseignez-le avant de generer un CV.",
      );
      return;
    }

    const request = buildRequest(profile);

    try {
      const response = await fetch(`/candidatures/generate-cv`, {
        body: JSON.stringify({ applicationId, ...request }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? "Génération échouée.");
      }

      window.location.href = `/cv/${applicationId}`;
    } catch (err) {
      setState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "La génération du CV a échoué. Réessayez.",
      );
    }
  }

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <Button
        disabled={state === "loading"}
        onClick={() => void handleClick()}
        type="button"
      >
        {state === "loading" ? "Génération en cours…" : "Générer le CV"}
      </Button>
      {state === "error" && errorMessage ? (
        <p
          style={{
            backgroundColor: "#FBEAE7",
            border: "1px solid #E5B8AF",
            borderRadius: "0.75rem",
            color: "#8A2C20",
            lineHeight: 1.6,
            margin: 0,
            padding: "0.75rem 1rem",
          }}
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
