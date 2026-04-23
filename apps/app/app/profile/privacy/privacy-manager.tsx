"use client";

import React from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@cvforge/ui";
import {
  BASE_PROFILE_STORAGE_KEY,
  clearBaseProfileFromStorage,
  loadBaseProfileFromStorage,
} from "../base-profile";
import {
  ONBOARDING_DRAFT_STORAGE_KEY,
  clearDraftFromStorage,
} from "../../onboarding/draft";
import type { PrivacyApiExportPayload, PrivacyRetentionPolicy } from "./route-types";

type PrivacyManagerProps = {
  retentionPolicy: PrivacyRetentionPolicy;
  sessionEmail: string;
};

function getStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function downloadJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export function PrivacyManager({
  retentionPolicy,
  sessionEmail,
}: PrivacyManagerProps) {
  const [confirmationEmail, setConfirmationEmail] = React.useState(sessionEmail);
  const [exportState, setExportState] = React.useState<"error" | "idle" | "loading" | "success">("idle");
  const [deleteState, setDeleteState] = React.useState<"error" | "idle" | "loading" | "success">("idle");
  const [deleteMessage, setDeleteMessage] = React.useState<string | null>(null);

  const handleExport = React.useCallback(async () => {
    setExportState("loading");

    try {
      const response = await fetch("/profile/privacy/export", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("export_failed");
      }

      const payload = (await response.json()) as PrivacyApiExportPayload;
      const localProfile = loadBaseProfileFromStorage(sessionEmail, getStorage());

      downloadJsonFile(
        `cvforge-privacy-export-${sessionEmail.replace(/[^a-z0-9]+/gi, "-")}.json`,
        {
          ...payload.exportData,
          localProfile,
          localStorageKeys: {
            baseProfile: BASE_PROFILE_STORAGE_KEY,
            onboardingDraft: ONBOARDING_DRAFT_STORAGE_KEY,
          },
        },
      );
      setExportState("success");
    } catch {
      setExportState("error");
    }
  }, [sessionEmail]);

  const handleDelete = React.useCallback(async () => {
    setDeleteState("loading");
    setDeleteMessage(null);

    try {
      const response = await fetch("/profile/privacy/delete", {
        body: JSON.stringify({ confirmationEmail }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error ?? "delete_failed");
      }

      clearBaseProfileFromStorage(getStorage());
      clearDraftFromStorage(getStorage());
      setDeleteState("success");
      setDeleteMessage("Le compte et les donnees associees ont ete supprimes.");

      window.location.href = "/login?accountDeleted=1";
    } catch (error) {
      setDeleteState("error");
      setDeleteMessage(
        error instanceof Error && error.message === "confirmation_mismatch"
          ? "L'email de confirmation doit correspondre exactement au compte connecte."
          : "La suppression du compte a echoue. Reessayez apres avoir exporte vos donnees.",
      );
    }
  }, [confirmationEmail]);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <Card>
        <CardHeader>
          <CardTitle>Export des donnees personnelles</CardTitle>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "0.85rem" }}>
          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            L&apos;export JSON regroupe le compte, les candidatures, le ledger de
            credits, les notifications, les invitations connues par l&apos;API et le
            profil de base conserve dans le navigateur.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Button onClick={handleExport} type="button">
              {exportState === "loading" ? "Preparation..." : "Telecharger mon export"}
            </Button>
            {exportState === "success" ? (
              <Badge variant="success">Export genere</Badge>
            ) : null}
            {exportState === "error" ? (
              <Badge
                style={{ backgroundColor: "#FDE8E6", color: "#7A271A" }}
                variant="accent"
              >
                Echec export
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suppression irreversible du compte</CardTitle>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "1rem" }}>
          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            Cette action efface le compte, les candidatures, les notifications, les
            credits lies au compte et purge aussi le profil local du navigateur.
          </p>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <Label htmlFor="privacy-confirmation-email">
              Confirmer l&apos;email du compte
            </Label>
            <Input
              id="privacy-confirmation-email"
              onChange={(event) => setConfirmationEmail(event.target.value)}
              placeholder={sessionEmail}
              type="email"
              value={confirmationEmail}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Button
              onClick={handleDelete}
              style={{ backgroundColor: "#B63C2F", color: "#FAFAF7" }}
              type="button"
              variant="secondary"
            >
              {deleteState === "loading" ? "Suppression..." : "Supprimer definitivement"}
            </Button>
            {deleteState === "success" ? (
              <Badge variant="success">Suppression terminee</Badge>
            ) : null}
            {deleteState === "error" ? (
              <Badge
                style={{ backgroundColor: "#FDE8E6", color: "#7A271A" }}
                variant="accent"
              >
                Suppression refusee
              </Badge>
            ) : null}
          </div>
          {deleteMessage ? (
            <p style={{ color: deleteState === "success" ? "#245135" : "#7A271A", lineHeight: 1.6, margin: 0 }}>
              {deleteMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Politique de retention MVP</CardTitle>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "1rem" }}>
          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            Politique documentee le {formatDate(`${retentionPolicy.documentedAt}T00:00:00.000Z`)}.
          </p>
          <div style={{ display: "grid", gap: "0.85rem" }}>
            {retentionPolicy.rules.map((rule) => (
              <article
                key={`${rule.dataType}-${rule.retention}`}
                style={{
                  border: "1px solid #D9D4CA",
                  borderRadius: "1rem",
                  display: "grid",
                  gap: "0.4rem",
                  padding: "1rem",
                }}
              >
                <strong>{rule.dataType}</strong>
                <span style={{ color: "#6B6860" }}>Retention: {rule.retention}</span>
                <span style={{ color: "#6B6860" }}>Action: {rule.action}</span>
                <span style={{ color: "#6B6860" }}>Automatisation: {rule.automation}</span>
              </article>
            ))}
          </div>
          <div
            style={{
              backgroundColor: "#FFF7E6",
              borderRadius: "1rem",
              color: "#6B4E16",
              padding: "1rem",
            }}
          >
            Purge audio planifiee: {retentionPolicy.audioPurgePlan.retentionDays} jours,
            execution quotidienne. Statut: {retentionPolicy.audioPurgePlan.status}.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
