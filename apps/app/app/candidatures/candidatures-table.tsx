"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button, Label } from "@cvforge/ui";
import type { ApplicationStatus, DraftApplication } from "@cvforge/types";
import { applicationStatuses } from "@cvforge/types";
import {
  getApplicationStatusLabel,
  getApplicationStatusTone,
} from "./status-metadata";
import { CandidaturesSlideOver } from "./candidatures-slide-over";
import { NouvelleCondidatureModal } from "./nouvelle-candidature-modal";

type SortColumn = "title" | "company" | "status" | "date" | "score";
type SortDir = "asc" | "desc";

type CandidaturesTableProps = {
  applications: DraftApplication[];
  sessionEmail: string;
  submittedUrl?: string;
};

const PAGE_SIZE = 20;

function getLatestScore(app: DraftApplication): number | null {
  const reports = app.interviewReports;
  if (!reports || reports.length === 0) return null;
  return reports[reports.length - 1].overallScore;
}

function renderDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { dateStyle: "medium" });
}

function compareValues(
  a: string | number | null,
  b: string | number | null,
  dir: SortDir,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const result = a < b ? -1 : a > b ? 1 : 0;
  return dir === "asc" ? result : -result;
}

export function CandidaturesTable({
  applications,
  sessionEmail,
  submittedUrl = "",
}: CandidaturesTableProps) {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortColumn>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selectedApp, setSelectedApp] = useState<DraftApplication | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSort = useCallback(
    (col: SortColumn) => {
      if (sortCol === col) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortCol(col);
        setSortDir("asc");
      }
      setPage(1);
    },
    [sortCol],
  );

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter.length > 0 && !statusFilter.includes(app.status)) return false;
      if (dateFrom && app.createdAt < dateFrom) return false;
      if (dateTo && app.createdAt > dateTo + "T23:59:59") return false;
      if (search) {
        const q = search.toLowerCase();
        const title = (app.extracted.title ?? "").toLowerCase();
        const company = (app.extracted.companyName ?? "").toLowerCase();
        if (!title.includes(q) && !company.includes(q)) return false;
      }
      return true;
    });
  }, [applications, statusFilter, dateFrom, dateTo, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sortCol) {
        case "title":
          return compareValues(a.extracted.title, b.extracted.title, sortDir);
        case "company":
          return compareValues(
            a.extracted.companyName ?? null,
            b.extracted.companyName ?? null,
            sortDir,
          );
        case "status":
          return compareValues(a.status, b.status, sortDir);
        case "date":
          return compareValues(a.createdAt, b.createdAt, sortDir);
        case "score":
          return compareValues(getLatestScore(a), getLatestScore(b), sortDir);
        default:
          return 0;
      }
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const displayed = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleFilterChange() {
    setPage(1);
  }

  function getAriaSort(col: SortColumn): "ascending" | "descending" | "none" {
    if (sortCol !== col) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  }

  function sortIndicator(col: SortColumn) {
    if (sortCol !== col) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  function toggleStatusFilter(status: ApplicationStatus) {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
    handleFilterChange();
  }

  return (
    <>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <span style={{ color: "#6B6860", fontSize: "0.9rem" }}>
          {filtered.length} candidature{filtered.length !== 1 ? "s" : ""}
          {applications.length !== filtered.length ? ` sur ${applications.length}` : ""}
        </span>
        <Button
          onClick={() => setModalOpen(true)}
          type="button"
        >
          + Nouvelle candidature
        </Button>
      </div>

      <div
        style={{
          alignItems: "flex-end",
          backgroundColor: "#F7F5F0",
          border: "1px solid #D8D2C8",
          borderRadius: "0.75rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
          padding: "1rem",
        }}
      >
        <div style={{ display: "grid", gap: "0.35rem" }}>
          <Label htmlFor="filter-search">Recherche</Label>
          <input
            id="filter-search"
            onChange={(e) => {
              setSearch(e.target.value);
              handleFilterChange();
            }}
            placeholder="Poste ou entreprise…"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D9D4CA",
              borderRadius: "0.5rem",
              color: "#1A1A18",
              minWidth: "200px",
              padding: "0.55rem 0.75rem",
            }}
            type="search"
            value={search}
          />
        </div>

        <div style={{ display: "grid", gap: "0.35rem" }}>
          <Label htmlFor="filter-date-from">Date de</Label>
          <input
            id="filter-date-from"
            onChange={(e) => {
              setDateFrom(e.target.value);
              handleFilterChange();
            }}
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D9D4CA",
              borderRadius: "0.5rem",
              color: "#1A1A18",
              padding: "0.55rem 0.75rem",
            }}
            type="date"
            value={dateFrom}
          />
        </div>

        <div style={{ display: "grid", gap: "0.35rem" }}>
          <Label htmlFor="filter-date-to">à</Label>
          <input
            id="filter-date-to"
            onChange={(e) => {
              setDateTo(e.target.value);
              handleFilterChange();
            }}
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D9D4CA",
              borderRadius: "0.5rem",
              color: "#1A1A18",
              padding: "0.55rem 0.75rem",
            }}
            type="date"
            value={dateTo}
          />
        </div>

        <fieldset
          style={{
            border: "none",
            display: "grid",
            gap: "0.35rem",
            margin: 0,
            padding: 0,
          }}
        >
          <legend
            style={{
              color: "#6B6860",
              fontSize: "0.875rem",
              fontWeight: 500,
              marginBottom: "0.35rem",
            }}
          >
            Statut
          </legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {applicationStatuses.map((status) => (
              <label
                key={status}
                style={{
                  alignItems: "center",
                  cursor: "pointer",
                  display: "flex",
                  fontSize: "0.85rem",
                  gap: "0.35rem",
                }}
              >
                <input
                  checked={statusFilter.includes(status)}
                  onChange={() => toggleStatusFilter(status)}
                  type="checkbox"
                />
                {getApplicationStatusLabel(status)}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            borderCollapse: "collapse",
            fontSize: "0.9rem",
            minWidth: "700px",
            width: "100%",
          }}
        >
          <caption
            style={{
              captionSide: "bottom",
              color: "#6B6860",
              fontSize: "0.8rem",
              marginTop: "0.5rem",
              textAlign: "left",
            }}
          >
            Liste de vos candidatures — cliquez sur une ligne pour voir le détail
          </caption>
          <thead>
            <tr
              style={{
                borderBottom: "2px solid #D8D2C8",
                textAlign: "left",
              }}
            >
              {(
                [
                  ["title", "Poste"],
                  ["company", "Entreprise"],
                  ["status", "Statut"],
                  ["date", "Date"],
                  ["score", "Score entretien"],
                ] as [SortColumn, string][]
              ).map(([col, label]) => (
                <th
                  aria-sort={getAriaSort(col)}
                  key={col}
                  onClick={() => handleSort(col)}
                  scope="col"
                  style={{
                    color: "#1A1A18",
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: "0.75rem 1rem",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                  <span aria-hidden="true" style={{ color: "#9B9690", fontSize: "0.75rem" }}>
                    {sortIndicator(col)}
                  </span>
                </th>
              ))}
              <th
                scope="col"
                style={{
                  color: "#1A1A18",
                  fontWeight: 600,
                  padding: "0.75rem 1rem",
                  whiteSpace: "nowrap",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    color: "#6B6860",
                    padding: "2rem 1rem",
                    textAlign: "center",
                  }}
                >
                  Aucune candidature ne correspond aux filtres appliqués.
                </td>
              </tr>
            ) : (
              displayed.map((app) => {
                const score = getLatestScore(app);
                return (
                  <tr
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    style={{
                      borderBottom: "1px solid #EBE7E0",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                        "#F7F5F0";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                        "transparent";
                    }}
                  >
                    <td
                      style={{
                        color: "#1A1A18",
                        fontWeight: 500,
                        padding: "0.85rem 1rem",
                      }}
                    >
                      {app.extracted.title}
                    </td>
                    <td style={{ color: "#6B6860", padding: "0.85rem 1rem" }}>
                      {app.extracted.companyName ?? "—"}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span
                        style={{
                          ...getApplicationStatusTone(app.status),
                          border: "1px solid",
                          borderRadius: "999px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          padding: "0.25rem 0.6rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getApplicationStatusLabel(app.status)}
                      </span>
                    </td>
                    <td
                      style={{
                        color: "#6B6860",
                        padding: "0.85rem 1rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {renderDate(app.createdAt)}
                    </td>
                    <td
                      style={{
                        color: score !== null ? "#7A5A26" : "#9B9690",
                        fontWeight: score !== null ? 600 : 400,
                        padding: "0.85rem 1rem",
                        textAlign: "center",
                      }}
                    >
                      {score !== null ? `${score}/100` : "—"}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <button
                        aria-label={`Voir le détail de ${app.extracted.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedApp(app);
                        }}
                        style={{
                          backgroundColor: "transparent",
                          border: "1px solid #D8D2C8",
                          borderRadius: "0.4rem",
                          color: "#2C2C2A",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          padding: "0.3rem 0.7rem",
                        }}
                        type="button"
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            marginTop: "1rem",
          }}
        >
          <button
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #D8D2C8",
              borderRadius: "0.5rem",
              color: safePage <= 1 ? "#9B9690" : "#2C2C2A",
              cursor: safePage <= 1 ? "default" : "pointer",
              padding: "0.4rem 0.9rem",
            }}
            type="button"
          >
            Précédent
          </button>
          <span style={{ color: "#6B6860", fontSize: "0.9rem" }}>
            Page {safePage} / {totalPages}
          </span>
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #D8D2C8",
              borderRadius: "0.5rem",
              color: safePage >= totalPages ? "#9B9690" : "#2C2C2A",
              cursor: safePage >= totalPages ? "default" : "pointer",
              padding: "0.4rem 0.9rem",
            }}
            type="button"
          >
            Suivant
          </button>
        </div>
      ) : null}

      {selectedApp ? (
        <CandidaturesSlideOver
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          sessionEmail={sessionEmail}
        />
      ) : null}

      <NouvelleCondidatureModal
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        submittedUrl={submittedUrl}
      />
    </>
  );
}
