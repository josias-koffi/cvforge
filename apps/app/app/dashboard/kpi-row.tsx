import React from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@cvforge/ui";
import type { ApplicationsKpiSummary, DraftApplication } from "@cvforge/types";

type KpiRowProps = {
  applications: DraftApplication[];
  credits: { balance: number };
  summary: ApplicationsKpiSummary;
};

function countActiveApplications(summary: ApplicationsKpiSummary) {
  return (
    summary.totalCount -
    summary.statusCounts.rejected -
    summary.statusCounts.offer_received
  );
}

function findNextInterview(applications: DraftApplication[]) {
  const scheduled = applications
    .filter((application) => application.status === "interview_scheduled")
    .map((application) => {
      const scheduledEntry = [...application.statusHistory]
        .reverse()
        .find((entry) => entry.status === "interview_scheduled");

      return {
        application,
        scheduledAt: scheduledEntry?.changedAt ?? application.updatedAt,
      };
    })
    .sort(
      (left, right) =>
        new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime(),
    );

  return scheduled[0] ?? null;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function KpiRow({ applications, credits, summary }: KpiRowProps) {
  const nextInterview = findNextInterview(applications);

  return (
    <div
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}
    >
      <Card>
        <CardHeader>
          <CardDescription>Candidatures actives</CardDescription>
          <CardTitle>{countActiveApplications(summary)}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Crédits restants</CardDescription>
          <CardTitle>{credits.balance}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Prochaine interview</CardDescription>
          {nextInterview ? (
            <>
              <CardTitle>{nextInterview.application.extracted.title}</CardTitle>
              <p style={{ color: "#6B6860", margin: 0 }}>
                {formatShortDate(nextInterview.scheduledAt)}
              </p>
            </>
          ) : (
            <CardTitle style={{ color: "#6B6860" }}>Aucun entretien planifié</CardTitle>
          )}
        </CardHeader>
      </Card>
    </div>
  );
}
