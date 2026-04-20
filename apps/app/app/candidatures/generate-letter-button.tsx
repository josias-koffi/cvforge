"use client";

import React, { useState } from "react";
import { Button } from "@cvforge/ui";
import type { LetterGenerationRequest } from "@cvforge/types";
import { BASE_PROFILE_STORAGE_KEY } from "../profile/base-profile";
import type { BaseProfile } from "../profile/base-profile";
import { AI_CANDIDATE_TOKEN } from "../profile/ai-prompt-profile";

type GenerateLetterButtonProps = {
  applicationId: string;
};

function buildRequest(profile: BaseProfile): LetterGenerationRequest {
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

export function GenerateLetterButton({
  applicationId,
}: GenerateLetterButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setState("loading");
    setErrorMessage(null);

    let profile: BaseProfile | null = null;

    try {
      const raw = localStorage.getItem(BASE_PROFILE_STORAGE_KEY);
      profile = raw ? (JSON.parse(raw) as BaseProfile) : null;
    } catch {
      // ignore parse errors
    }

    if (!profile || !profile.identity.firstName.trim()) {
      setState("error");
      setErrorMessage(
        "Votre profil de base est vide. Renseignez-le avant de générer une LM.",
      );
      return;
    }

    try {
      const response = await fetch(`/candidatures/generate-letter`, {
        body: JSON.stringify({ applicationId, ...buildRequest(profile) }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(data.message ?? "Génération échouée.");
      }

      window.location.href = `/letters/${applicationId}`;
    } catch (error) {
      setState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "La génération de la LM a échoué. Réessayez.",
      );
    }
  }

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <Button
        disabled={state === "loading"}
        onClick={() => void handleClick()}
        type="button"
        variant="secondary"
      >
        {state === "loading" ? "Génération en cours…" : "Générer la LM"}
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
