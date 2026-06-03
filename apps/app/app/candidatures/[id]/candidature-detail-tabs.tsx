"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Textarea } from "@cvforge/ui";
import type { DraftApplication } from "@cvforge/types";
import { ApplicationProfileSelector } from "../application-profile-selector";
import { GenerateCvButton } from "../generate-cv-button";
import { GenerateLetterButton } from "../generate-letter-button";
import { CandidatureDetailHeader } from "./candidature-detail-header";
import { CandidatureHistoryTab } from "./candidature-history-tab";

type Tab = "offre" | "cv" | "lm" | "interviews" | "historique";

const TABS: { id: Tab; label: string }[] = [
  { id: "offre", label: "Offre" },
  { id: "cv", label: "CV" },
  { id: "lm", label: "LM" },
  { id: "interviews", label: "Interviews" },
  { id: "historique", label: "Historique" },
];

type Props = {
  application: DraftApplication;
  sessionEmail: string;
  statusError?: string;
  statusUpdated?: boolean;
};

function renderDatetime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function OffreTab({ application }: { application: DraftApplication }) {
  const { extracted } = application;
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <p style={{ color: "#1A1A18", lineHeight: 1.7, margin: 0 }}>
        {extracted.summary}
      </p>

      {(extracted.location || extracted.contractType || extracted.salaryRange) ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {extracted.location ? (
            <span style={chipStyle}>📍 {extracted.location}</span>
          ) : null}
          {extracted.contractType ? (
            <span style={chipStyle}>📄 {extracted.contractType}</span>
          ) : null}
          {extracted.salaryRange ? (
            <span style={chipStyle}>💶 {extracted.salaryRange}</span>
          ) : null}
        </div>
      ) : null}

      {extracted.responsibilities.length > 0 ? (
        <div>
          <h3 style={sectionHeadingStyle}>Responsabilités</h3>
          <ul style={listStyle}>
            {extracted.responsibilities.map((r, i) => (
              <li key={i} style={{ marginBottom: "0.3rem" }}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {extracted.requirements.length > 0 ? (
        <div>
          <h3 style={sectionHeadingStyle}>Prérequis</h3>
          <ul style={listStyle}>
            {extracted.requirements.map((r, i) => (
              <li key={i} style={{ marginBottom: "0.3rem" }}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {application.offerUrl ? (
        <p style={{ margin: 0 }}>
          <a
            href={application.offerUrl}
            rel="noopener noreferrer"
            style={{ color: "#305A7A", fontSize: "0.875rem" }}
            target="_blank"
          >
            Voir l&apos;offre originale →
          </a>
        </p>
      ) : null}
    </div>
  );
}

const REFINEMENT_MAX = 500;

function RefinementField({
  onChange,
  value,
}: {
  onChange: (v: string) => void;
  value: string;
}) {
  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <label htmlFor="lm-refinement" style={{ color: "#1A1A18", fontSize: "0.875rem", fontWeight: 500 }}>
        Raffinement <span style={{ color: "#6B6860", fontWeight: 400 }}>(optionnel)</span>
      </label>
      <p style={{ color: "#6B6860", fontSize: "0.8rem", margin: 0 }}>
        Précisez votre motivation spécifique pour ce poste. Ce texte enrichit la génération de la LM.
      </p>
      <Textarea
        id="lm-refinement"
        maxLength={REFINEMENT_MAX}
        placeholder="Ex. : Je suis particulièrement attiré par leur approche open-source et leur culture de l'autonomie…"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p style={{ color: "#6B6860", fontSize: "0.75rem", margin: 0, textAlign: "right" }}>
        {value.length} / {REFINEMENT_MAX}
      </p>
    </div>
  );
}

function CvTab({
  application,
  sessionEmail,
}: {
  application: DraftApplication;
  sessionEmail: string;
}) {
  const id = application.id;
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {!application.cvGeneratedAt ? null : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <Link href={`/cv/${id}`}>
            <Button type="button">Éditer le CV</Button>
          </Link>
          <a href={`/cv/${id}/pdf`} rel="noopener noreferrer" style={downloadLinkStyle} target="_blank">
            Télécharger PDF
          </a>
          <a href={`/cv/${id}/docx`} rel="noopener noreferrer" style={downloadLinkStyle} target="_blank">
            Télécharger DOCX
          </a>
        </div>
      )}
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <ApplicationProfileSelector applicationId={id} sessionEmail={sessionEmail} />
        <GenerateCvButton applicationId={id} sessionEmail={sessionEmail} />
      </div>
    </div>
  );
}

function LmTab({
  application,
  sessionEmail,
}: {
  application: DraftApplication;
  sessionEmail: string;
}) {
  const id = application.id;
  const [refinement, setRefinement] = useState("");
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {!application.letterGeneratedAt ? null : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <Link href={`/letters/${id}`}>
            <Button type="button">Éditer la LM</Button>
          </Link>
          <a href={`/letters/${id}/pdf`} rel="noopener noreferrer" style={downloadLinkStyle} target="_blank">
            Télécharger PDF
          </a>
          <a href={`/letters/${id}/docx`} rel="noopener noreferrer" style={downloadLinkStyle} target="_blank">
            Télécharger DOCX
          </a>
        </div>
      )}
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <ApplicationProfileSelector applicationId={id} sessionEmail={sessionEmail} />
        <RefinementField value={refinement} onChange={setRefinement} />
        <GenerateLetterButton applicationId={id} refinement={refinement} sessionEmail={sessionEmail} />
      </div>
    </div>
  );
}

function InterviewsTab({ application }: { application: DraftApplication }) {
  const reports = application.interviewReports ?? [];
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <Link href={`/interview?candidatureId=${application.id}`}>
          <Button type="button">Démarrer un entretien</Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <p style={{ color: "#6B6860", margin: 0 }}>
          Aucun entretien effectué pour cette candidature.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: "0.9rem", width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #D8D2C8", textAlign: "left" }}>
                <th scope="col" style={thStyle}>Date</th>
                <th scope="col" style={thStyle}>Score</th>
                <th scope="col" style={thStyle}>Résumé</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #EBE7E0" }}>
                  <td style={tdStyle}>{renderDatetime(report.createdAt)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: "#7A5A26" }}>
                    {report.overallScore}/100
                  </td>
                  <td style={{ ...tdStyle, color: "#6B6860", maxWidth: "320px" }}>
                    {report.summary ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  backgroundColor: "#F2F0EB",
  border: "1px solid #D8D2C8",
  borderRadius: "999px",
  color: "#6B6860",
  fontSize: "0.8rem",
  padding: "0.25rem 0.65rem",
};

const sectionHeadingStyle: React.CSSProperties = {
  color: "#1A1A18",
  fontSize: "0.95rem",
  fontWeight: 600,
  margin: "0 0 0.5rem",
};

const listStyle: React.CSSProperties = {
  color: "#3A3A38",
  lineHeight: 1.6,
  margin: 0,
  paddingLeft: "1.4rem",
};

const downloadLinkStyle: React.CSSProperties = {
  alignItems: "center",
  backgroundColor: "#F2F0EB",
  border: "1px solid #D8D2C8",
  borderRadius: "0.5rem",
  color: "#2C2C2A",
  display: "inline-flex",
  fontSize: "0.875rem",
  fontWeight: 500,
  padding: "0.5rem 1rem",
  textDecoration: "none",
};

const thStyle: React.CSSProperties = {
  color: "#1A1A18",
  fontWeight: 600,
  padding: "0.75rem 1rem",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  color: "#1A1A18",
  padding: "0.75rem 1rem",
  verticalAlign: "top",
};

export function CandidatureDetailTabs({
  application,
  sessionEmail,
  statusError,
  statusUpdated,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("offre");

  function handleKeyDown(e: React.KeyboardEvent, tabIndex: number) {
    if (e.key === "ArrowRight") {
      const next = TABS[(tabIndex + 1) % TABS.length];
      setActiveTab(next.id);
    } else if (e.key === "ArrowLeft") {
      const prev = TABS[(tabIndex - 1 + TABS.length) % TABS.length];
      setActiveTab(prev.id);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <CandidatureDetailHeader
        application={application}
        statusError={statusError}
        statusUpdated={statusUpdated}
      />

      {/* Tabs + Panel */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #D8D2C8",
          borderRadius: "0.75rem",
          overflow: "hidden",
        }}
      >
        {/* Tab bar */}
        <div
          role="tablist"
          style={{
            borderBottom: "1px solid #D8D2C8",
            display: "flex",
            overflowX: "auto",
          }}
        >
          {TABS.map((tab, i) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                aria-controls={`tabpanel-${tab.id}`}
                aria-selected={isActive}
                id={`tab-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                role="tab"
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom: isActive ? "2px solid #1A1A18" : "2px solid transparent",
                  color: isActive ? "#1A1A18" : "#6B6860",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: isActive ? 600 : 400,
                  outline: "none",
                  padding: "0.85rem 1.25rem",
                  whiteSpace: "nowrap",
                }}
                tabIndex={isActive ? 0 : -1}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab panels — all rendered, inactive hidden */}
        {TABS.map((tab) => (
          <div
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            id={`tabpanel-${tab.id}`}
            key={tab.id}
            role="tabpanel"
            style={{ display: activeTab === tab.id ? "block" : "none", padding: "1.5rem" }}
          >
            {tab.id === "offre" ? <OffreTab application={application} /> : null}
            {tab.id === "cv" ? <CvTab application={application} sessionEmail={sessionEmail} /> : null}
            {tab.id === "lm" ? <LmTab application={application} sessionEmail={sessionEmail} /> : null}
            {tab.id === "interviews" ? <InterviewsTab application={application} /> : null}
            {tab.id === "historique" ? <CandidatureHistoryTab application={application} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
