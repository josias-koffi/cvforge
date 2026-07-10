import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@cvforge/ui";
import type { DraftApplication } from "@cvforge/types";
import {
  getApplicationStatusLabel,
  getApplicationStatusTone,
} from "../candidatures/status-metadata";

const TABLE_STYLE: React.CSSProperties = {
  borderCollapse: "collapse",
  fontSize: "0.9rem",
  width: "100%",
};

const HEADER_ROW_STYLE: React.CSSProperties = {
  borderBottom: "2px solid #D8D2C8",
  textAlign: "left",
};

const HEADER_CELL_STYLE: React.CSSProperties = {
  color: "#1A1A18",
  fontWeight: 600,
  padding: "0.75rem 1rem",
  whiteSpace: "nowrap",
};

const ROW_STYLE: React.CSSProperties = {
  borderBottom: "1px solid #EBE7E0",
};

const CELL_STYLE: React.CSSProperties = {
  color: "#6B6860",
  padding: "0.85rem 1rem",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function getRecentApplications(applications: DraftApplication[]) {
  return [...applications]
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )
    .slice(0, 5);
}

type InterviewRow = {
  applicationTitle: string;
  createdAt: string;
  score: number;
};

function getRecentInterviewSessions(applications: DraftApplication[]): InterviewRow[] {
  return applications
    .flatMap((application) =>
      (application.interviewReports ?? []).map((report) => ({
        applicationTitle: application.extracted.title,
        createdAt: report.createdAt,
        score: report.overallScore,
      })),
    )
    .sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, 5);
}

function ApplicationsTable({ applications }: { applications: DraftApplication[] }) {
  const rows = getRecentApplications(applications);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidatures récentes</CardTitle>
      </CardHeader>
      <CardContent style={{ overflowX: "auto" }}>
        <table style={TABLE_STYLE}>
          <thead>
            <tr style={HEADER_ROW_STYLE}>
              <th scope="col" style={HEADER_CELL_STYLE}>Poste</th>
              <th scope="col" style={HEADER_CELL_STYLE}>Statut</th>
              <th scope="col" style={HEADER_CELL_STYLE}>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ ...CELL_STYLE, textAlign: "center" }}>
                  Aucune candidature enregistrée pour le moment.
                </td>
              </tr>
            ) : (
              rows.map((application) => (
                <tr key={application.id} style={ROW_STYLE}>
                  <td style={{ ...CELL_STYLE, color: "#1A1A18", fontWeight: 500 }}>
                    {application.extracted.title}
                  </td>
                  <td style={CELL_STYLE}>
                    <span
                      style={{
                        ...getApplicationStatusTone(application.status),
                        border: "1px solid",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        padding: "0.25rem 0.6rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getApplicationStatusLabel(application.status)}
                    </span>
                  </td>
                  <td style={{ ...CELL_STYLE, whiteSpace: "nowrap" }}>
                    {formatDate(application.updatedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function InterviewSessionsTable({ applications }: { applications: DraftApplication[] }) {
  const rows = getRecentInterviewSessions(applications);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions entretien récentes</CardTitle>
      </CardHeader>
      <CardContent style={{ overflowX: "auto" }}>
        <table style={TABLE_STYLE}>
          <thead>
            <tr style={HEADER_ROW_STYLE}>
              <th scope="col" style={HEADER_CELL_STYLE}>Candidature</th>
              <th scope="col" style={HEADER_CELL_STYLE}>Score</th>
              <th scope="col" style={HEADER_CELL_STYLE}>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ ...CELL_STYLE, textAlign: "center" }}>
                  Aucune session d&apos;entretien enregistrée pour le moment.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.applicationTitle}-${row.createdAt}-${index}`} style={ROW_STYLE}>
                  <td style={{ ...CELL_STYLE, color: "#1A1A18", fontWeight: 500 }}>
                    {row.applicationTitle}
                  </td>
                  <td style={CELL_STYLE}>{row.score}/10</td>
                  <td style={{ ...CELL_STYLE, whiteSpace: "nowrap" }}>
                    {formatDate(row.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function RecentTables({ applications }: { applications: DraftApplication[] }) {
  return (
    <div
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      }}
    >
      <ApplicationsTable applications={applications} />
      <InterviewSessionsTable applications={applications} />
    </div>
  );
}
