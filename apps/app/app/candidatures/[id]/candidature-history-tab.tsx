"use client";

import React from "react";
import type { ApplicationStatus, DraftApplication } from "@cvforge/types";
import {
  getApplicationStatusLabel,
  getApplicationStatusTone,
} from "../status-metadata";

type Props = {
  application: DraftApplication;
};

function renderDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { dateStyle: "medium" });
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
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

export function CandidatureHistoryTab({ application }: Props) {
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
