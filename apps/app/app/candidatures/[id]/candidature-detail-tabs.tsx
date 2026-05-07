"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@cvforge/ui";
import type { DraftApplication } from "@cvforge/types";
import {
  getApplicationStatusLabel,
  getApplicationStatusTone,
} from "../status-metadata";

type Tab = "offre" | "cv" | "lm" | "interviews" | "historique";

const TABS: { id: Tab; label: string }[] = [
  { id: "offre", label: "Offre" },
  { id: "cv", label: "CV" },
  { id: "lm", label: "LM" },
  { id: "interviews", label: "Interviews" },
  { id: "historique", label: "Historique" },
];

type Props = { application: DraftApplication };

function renderDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { dateStyle: "medium" });
}

function renderDatetime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status: DraftApplication["status"] }) {
  return (
    <span
      style={{
        ...getApplicationStatusTone(status),
        border: "1px solid",
        borderRadius: "999px",
        fontSize: "0.8rem",
        fontWeight: 600,
        padding: "0.25rem 0.65rem",
        whiteSpace: "nowrap",
      }}
    >
      {getApplicationStatusLabel(status)}
    </span>
  );
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
            Voir l'offre originale →
          </a>
        </p>
      ) : null}
    </div>
  );
}

function CvTab({ application }: { application: DraftApplication }) {
  const id = application.id;
  if (!application.cvGeneratedAt) {
    return (
      <div style={{ color: "#6B6860", padding: "1rem 0" }}>
        <p style={{ marginTop: 0 }}>Aucun CV généré pour cette candidature.</p>
        <Link href={`/candidatures?open=${id}`}>
          <Button type="button">Générer un CV</Button>
        </Link>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", padding: "0.5rem 0" }}>
      <Link href={`/cv/${id}`}>
        <Button type="button">Éditer le CV</Button>
      </Link>
      <a
        href={`/cv/${id}/pdf`}
        rel="noopener noreferrer"
        style={downloadLinkStyle}
        target="_blank"
      >
        Télécharger PDF
      </a>
      <a
        href={`/cv/${id}/docx`}
        rel="noopener noreferrer"
        style={downloadLinkStyle}
        target="_blank"
      >
        Télécharger DOCX
      </a>
    </div>
  );
}

function LmTab({ application }: { application: DraftApplication }) {
  const id = application.id;
  if (!application.letterGeneratedAt) {
    return (
      <div style={{ color: "#6B6860", padding: "1rem 0" }}>
        <p style={{ marginTop: 0 }}>Aucune lettre de motivation générée pour cette candidature.</p>
        <Link href={`/candidatures?open=${id}`}>
          <Button type="button">Générer une LM</Button>
        </Link>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", padding: "0.5rem 0" }}>
      <Link href={`/letters/${id}`}>
        <Button type="button">Éditer la LM</Button>
      </Link>
      <a
        href={`/letters/${id}/pdf`}
        rel="noopener noreferrer"
        style={downloadLinkStyle}
        target="_blank"
      >
        Télécharger PDF
      </a>
      <a
        href={`/letters/${id}/docx`}
        rel="noopener noreferrer"
        style={downloadLinkStyle}
        target="_blank"
      >
        Télécharger DOCX
      </a>
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

function HistoriqueTab({ application }: { application: DraftApplication }) {
  const history = [...(application.statusHistory ?? [])].reverse();
  return (
    <div style={{ display: "grid", gap: "0" }}>
      {history.map((entry, i) => (
        <div
          key={i}
          style={{
            alignItems: "flex-start",
            display: "flex",
            gap: "1rem",
            paddingBottom: i < history.length - 1 ? "1.25rem" : 0,
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              gap: 0,
            }}
          >
            <div
              style={{
                backgroundColor: "#6B6860",
                borderRadius: "50%",
                height: "10px",
                width: "10px",
              }}
            />
            {i < history.length - 1 ? (
              <div
                style={{
                  backgroundColor: "#D8D2C8",
                  flexGrow: 1,
                  marginTop: "4px",
                  width: "2px",
                }}
              />
            ) : null}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", paddingTop: "0" }}>
            <span style={{ color: "#6B6860", fontSize: "0.875rem" }}>
              {renderDate(entry.changedAt)}
            </span>
            <StatusBadge status={entry.status} />
          </div>
        </div>
      ))}
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

export function CandidatureDetailTabs({ application }: Props) {
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

  const tone = getApplicationStatusTone(application.status);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* Header */}
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
            gap: "0.75rem",
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
              Créée le {renderDate(application.createdAt)}
            </p>
          </div>
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
            {getApplicationStatusLabel(application.status)}
          </span>
        </div>
      </div>

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
            {tab.id === "cv" ? <CvTab application={application} /> : null}
            {tab.id === "lm" ? <LmTab application={application} /> : null}
            {tab.id === "interviews" ? <InterviewsTab application={application} /> : null}
            {tab.id === "historique" ? <HistoriqueTab application={application} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
