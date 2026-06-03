"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@cvforge/ui";
import type { ApplicationStatus, DraftApplication } from "@cvforge/types";
import {
  applicationStatusActionLabels,
  applicationStatusTransitions,
  getApplicationStatusLabel,
  getApplicationStatusTone,
} from "../status-metadata";

type Props = {
  application: DraftApplication;
  statusError?: string;
  statusUpdated?: boolean;
};

const STATUS_ERROR_MESSAGES: Record<string, string> = {
  status_invalid: "Le statut demande est invalide.",
  status_not_found: "Cette candidature est introuvable.",
  status_request_failed: "La mise a jour du suivi a echoue.",
  status_transition_forbidden: "Cette transition de suivi n'est pas autorisee.",
};

function renderDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { dateStyle: "medium" });
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const tone = getApplicationStatusTone(status);

  return (
    <span
      style={{
        ...tone,
        border: "1px solid",
        borderRadius: "999px",
        fontSize: "0.85rem",
        fontWeight: 600,
        padding: "0.3rem 0.8rem",
        whiteSpace: "nowrap",
      }}
    >
      {getApplicationStatusLabel(status)}
    </span>
  );
}

function StatusUpdateForm({
  application,
  statusError,
  statusUpdated,
}: Props) {
  const nextStatuses = applicationStatusTransitions[
    application.status
  ] as readonly ApplicationStatus[];
  const statusFeedbackId = "candidature-status-feedback";

  if (nextStatuses.length === 0) {
    return (
      <div style={{ color: "#6B6860", fontSize: "0.85rem" }}>
        Suivi finalise
      </div>
    );
  }

  return (
    <form
      action="/candidatures/status"
      aria-describedby={statusFeedbackId}
      method="post"
      style={{
        alignItems: "flex-end",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        justifyContent: "flex-end",
      }}
    >
      <input name="applicationId" type="hidden" value={application.id} />
      <input name="returnTo" type="hidden" value={`/candidatures/${application.id}`} />
      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label
          htmlFor="next-candidature-status"
          style={{ color: "#1A1A18", fontSize: "0.8rem", fontWeight: 600 }}
        >
          Suivi de candidature
        </label>
        <select
          defaultValue={nextStatuses[0]}
          id="next-candidature-status"
          name="nextStatus"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #D8D2C8",
            borderRadius: "0.5rem",
            color: "#1A1A18",
            fontSize: "0.875rem",
            minHeight: "2.25rem",
            minWidth: "13rem",
            padding: "0.45rem 0.65rem",
          }}
        >
          {nextStatuses.map((status) => (
            <option key={status} value={status}>
              {applicationStatusActionLabels[status]}
            </option>
          ))}
        </select>
      </div>
      <Button size="sm" type="submit">
        Mettre a jour
      </Button>
      <p
        aria-live="polite"
        id={statusFeedbackId}
        style={{
          color: statusError ? "#8A2C20" : "#30543A",
          flexBasis: "100%",
          fontSize: "0.8rem",
          margin: 0,
          textAlign: "right",
        }}
      >
        {statusError
          ? STATUS_ERROR_MESSAGES[statusError] ?? STATUS_ERROR_MESSAGES.status_request_failed
          : statusUpdated
            ? "Suivi mis a jour."
            : ""}
      </p>
    </form>
  );
}

export function CandidatureDetailHeader({
  application,
  statusError,
  statusUpdated,
}: Props) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #D8D2C8",
        borderRadius: "0.75rem",
        padding: "1.25rem 1.5rem",
      }}
    >
      <div
        style={{
          alignItems: "flex-start",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.35rem" }}>
            {application.extracted.title}
          </h1>
          <p style={{ color: "#6B6860", fontSize: "0.9rem", margin: 0 }}>
            {application.extracted.companyName ?? "Entreprise inconnue"}
            {" · "}
            Creee le {renderDate(application.createdAt)}
          </p>
        </div>
        <div
          style={{
            alignItems: "flex-end",
            display: "grid",
            gap: "0.65rem",
            justifyItems: "end",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <StatusBadge status={application.status} />
            <Link href={`/interview/new?candidatureId=${application.id}`}>
              <Button size="sm" variant="secondary">
                Preparer un entretien
              </Button>
            </Link>
          </div>
          <StatusUpdateForm
            application={application}
            statusError={statusError}
            statusUpdated={statusUpdated}
          />
        </div>
      </div>
    </div>
  );
}
