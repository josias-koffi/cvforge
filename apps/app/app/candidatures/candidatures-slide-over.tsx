"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Textarea } from "@cvforge/ui";
import type { DraftApplication } from "@cvforge/types";
import {
  applicationStatusActionLabels,
  applicationStatusTransitions,
  getApplicationStatusLabel,
  getApplicationStatusTone,
} from "./status-metadata";
import { ApplicationProfileSelector } from "./application-profile-selector";
import { GenerateCvButton } from "./generate-cv-button";
import { GenerateLetterButton } from "./generate-letter-button";

type CandidaturesSlideOverProps = {
  application: DraftApplication;
  onClose: () => void;
  sessionEmail: string;
};

function renderDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getLatestInterviewScore(application: DraftApplication): number | null {
  const reports = application.interviewReports;
  if (!reports || reports.length === 0) return null;
  return reports[reports.length - 1].overallScore;
}

export function CandidaturesSlideOver({
  application,
  onClose,
  sessionEmail,
}: CandidaturesSlideOverProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const score = getLatestInterviewScore(application);
  const transitions = applicationStatusTransitions[application.status];
  const [letterRefinement, setLetterRefinement] = useState("");

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          backgroundColor: "rgba(26, 26, 24, 0.4)",
          bottom: 0,
          left: 0,
          position: "fixed",
          right: 0,
          top: 0,
          zIndex: 40,
        }}
      />
      <div
        aria-label="Détail de la candidature"
        aria-modal="true"
        role="dialog"
        style={{
          backgroundColor: "#FAFAF7",
          bottom: 0,
          boxShadow: "-4px 0 24px rgba(26,26,24,0.12)",
          display: "flex",
          flexDirection: "column",
          maxWidth: "100vw",
          overflowY: "auto",
          position: "fixed",
          right: 0,
          top: 0,
          width: "420px",
          zIndex: 50,
        }}
      >
        <div
          style={{
            alignItems: "center",
            borderBottom: "1px solid #D8D2C8",
            display: "flex",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
          }}
        >
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <h2
              style={{
                color: "#1A1A18",
                fontSize: "1.125rem",
                fontWeight: 600,
                margin: 0,
              }}
            >
              {application.extracted.title}
            </h2>
            <p style={{ color: "#6B6860", fontSize: "0.9rem", margin: 0 }}>
              {application.extracted.companyName ?? "Entreprise non détectée"}
              {application.extracted.location
                ? ` · ${application.extracted.location}`
                : ""}
            </p>
          </div>
          <button
            aria-label="Fermer le détail"
            onClick={onClose}
            ref={closeRef}
            style={{
              background: "none",
              border: "1px solid #D8D2C8",
              borderRadius: "0.5rem",
              color: "#6B6860",
              cursor: "pointer",
              fontSize: "1rem",
              lineHeight: 1,
              padding: "0.4rem 0.6rem",
            }}
            type="button"
          >
            ✕
          </button>
        </div>

        <div style={{ display: "grid", gap: "1.25rem", padding: "1.5rem" }}>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <span
              style={{
                ...getApplicationStatusTone(application.status),
                border: "1px solid",
                borderRadius: "999px",
                fontSize: "0.85rem",
                fontWeight: 600,
                padding: "0.35rem 0.75rem",
              }}
            >
              {getApplicationStatusLabel(application.status)}
            </span>
            <span style={{ color: "#6B6860", fontSize: "0.9rem" }}>
              Créée le {renderDate(application.createdAt)}
            </span>
            {score !== null ? (
              <span
                style={{
                  backgroundColor: "#F3EEE3",
                  border: "1px solid #DCC7A0",
                  borderRadius: "999px",
                  color: "#7A5A26",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  padding: "0.35rem 0.75rem",
                }}
              >
                Score: {score}/100
              </span>
            ) : null}
          </div>

          {transitions.length > 0 ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <strong style={{ color: "#1A1A18", fontSize: "0.9rem" }}>
                Changer le statut
              </strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {transitions.map((nextStatus) => (
                  <form
                    action="/candidatures/status"
                    key={nextStatus}
                    method="POST"
                  >
                    <input
                      name="applicationId"
                      type="hidden"
                      value={application.id}
                    />
                    <input name="nextStatus" type="hidden" value={nextStatus} />
                    <Button type="submit" variant="secondary">
                      {applicationStatusActionLabels[nextStatus]}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: "#6B6860", fontSize: "0.9rem", margin: 0 }}>
              Statut terminal — aucune transition disponible.
            </p>
          )}

          <div
            style={{
              borderTop: "1px solid #D8D2C8",
              display: "grid",
              gap: "0.75rem",
              paddingTop: "1.25rem",
            }}
          >
            <strong style={{ color: "#1A1A18", fontSize: "0.9rem" }}>
              Génération du CV
            </strong>
            <ApplicationProfileSelector
              applicationId={application.id}
              sessionEmail={sessionEmail}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <GenerateCvButton
                applicationId={application.id}
                sessionEmail={sessionEmail}
              />
              {application.cvGeneratedAt ? (
                <a
                  href={`/cv/${application.id}`}
                  style={{
                    alignItems: "center",
                    border: "1px solid #C8A96E",
                    borderRadius: "0.5rem",
                    color: "#2C2C2A",
                    display: "inline-flex",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    padding: "0.45rem 0.9rem",
                    textDecoration: "none",
                  }}
                >
                  Voir le CV
                </a>
              ) : null}
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid #D8D2C8",
              display: "grid",
              gap: "0.75rem",
              paddingTop: "1.25rem",
            }}
          >
            <strong style={{ color: "#1A1A18", fontSize: "0.9rem" }}>
              Génération de la LM
            </strong>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <div style={{ display: "grid", gap: "0.25rem" }}>
                <label htmlFor="slide-lm-refinement" style={{ color: "#1A1A18", fontSize: "0.8rem", fontWeight: 500 }}>
                  Raffinement <span style={{ color: "#6B6860", fontWeight: 400 }}>(optionnel)</span>
                </label>
                <Textarea
                  id="slide-lm-refinement"
                  maxLength={500}
                  placeholder="Précisez votre motivation spécifique…"
                  rows={2}
                  value={letterRefinement}
                  onChange={(e) => setLetterRefinement(e.target.value)}
                />
                <p style={{ color: "#6B6860", fontSize: "0.7rem", margin: 0, textAlign: "right" }}>
                  {letterRefinement.length} / 500
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <GenerateLetterButton
                applicationId={application.id}
                refinement={letterRefinement}
                sessionEmail={sessionEmail}
              />
              {application.letterGeneratedAt ? (
                <a
                  href={`/letters/${application.id}`}
                  style={{
                    alignItems: "center",
                    border: "1px solid #C8A96E",
                    borderRadius: "0.5rem",
                    color: "#2C2C2A",
                    display: "inline-flex",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    padding: "0.45rem 0.9rem",
                    textDecoration: "none",
                  }}
                >
                  Voir la LM
                </a>
              ) : null}
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid #D8D2C8",
              display: "grid",
              gap: "0.5rem",
              paddingTop: "1.25rem",
            }}
          >
            <strong style={{ color: "#1A1A18", fontSize: "0.9rem" }}>
              Informations extraites
            </strong>
            <dl style={{ display: "grid", gap: "0.5rem", margin: 0 }}>
              {application.extracted.contractType ? (
                <div>
                  <dt style={{ color: "#6B6860", fontSize: "0.85rem", fontWeight: 600 }}>
                    Contrat
                  </dt>
                  <dd style={{ fontSize: "0.9rem", margin: 0 }}>
                    {application.extracted.contractType}
                  </dd>
                </div>
              ) : null}
              {application.extracted.salaryRange ? (
                <div>
                  <dt style={{ color: "#6B6860", fontSize: "0.85rem", fontWeight: 600 }}>
                    Salaire
                  </dt>
                  <dd style={{ fontSize: "0.9rem", margin: 0 }}>
                    {application.extracted.salaryRange}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt style={{ color: "#6B6860", fontSize: "0.85rem", fontWeight: 600 }}>
                  Historique des statuts
                </dt>
                <dd style={{ fontSize: "0.9rem", margin: 0 }}>
                  <ul
                    style={{
                      display: "grid",
                      gap: "0.25rem",
                      margin: 0,
                      paddingLeft: "1.25rem",
                    }}
                  >
                    {application.statusHistory.map((entry) => (
                      <li key={`${entry.status}-${entry.changedAt}`}>
                        {getApplicationStatusLabel(entry.status)} ·{" "}
                        {renderDate(entry.changedAt)}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </div>

          <div
            style={{
              borderTop: "1px solid #D8D2C8",
              paddingTop: "1.25rem",
            }}
          >
            <a
              href={`/candidatures/${application.id}`}
              style={{
                color: "#6B6860",
                fontSize: "0.85rem",
                textDecoration: "underline",
              }}
            >
              Voir le détail complet →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
