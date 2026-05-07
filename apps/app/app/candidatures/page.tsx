import React from "react";
import { cookies } from "next/headers";
import { AppShell, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cvforge/ui";
import type { ApplicationsKpiSummary, ApplicationStatus, DraftApplication } from "@cvforge/types";
import { getServerApiUrl } from "../auth-config";
import { requireSession } from "../auth/session";
import { getAppNavigation } from "../content";
import { NotificationBell } from "../notifications/notification-bell";
import { CandidaturesTable } from "./candidatures-table";

type ApplicationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

async function fetchApplications() {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const response = await fetch(`${getServerApiUrl()}/applications`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new Error("Impossible de recuperer les candidatures.");
  }

  const payload = (await response.json()) as { applications: DraftApplication[] };

  return payload.applications;
}

async function fetchApplicationsSummary() {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const response = await fetch(`${getServerApiUrl()}/applications/summary`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new Error("Impossible de recuperer le resume des candidatures.");
  }

  const payload = (await response.json()) as { summary: ApplicationsKpiSummary };

  return payload.summary;
}

function resolveMessage(errorCode: string | null) {
  switch (errorCode) {
    case "invalid_url":
      return "L'URL fournie est invalide. Collez une URL http ou https complete.";
    case "invalid_text":
      return "Collez le texte integral de l'offre pour activer le fallback manuel.";
    case "unreachable":
      return "Le site de l'offre n'a pas pu etre recupere depuis le serveur.";
    case "unprocessable":
      return "Le contenu fourni est insuffisant pour creer une candidature. Essayez avec une URL plus complete ou collez davantage de texte.";
    case "request_failed":
      return "L'import de l'offre a echoue. Reessayez dans un instant.";
    case "status_invalid":
      return "Le statut demande est invalide.";
    case "status_not_found":
      return "La candidature cible est introuvable.";
    case "status_transition_forbidden":
      return "Cette transition de statut n'est pas autorisee pour cette candidature.";
    case "status_request_failed":
      return "La mise a jour du statut a echoue. Reessayez dans un instant.";
    default:
      return null;
  }
}

async function resolveSearchParams(
  searchParams: ApplicationsPageProps["searchParams"],
) {
  if (!searchParams) {
    return {};
  }

  return await searchParams;
}

function renderStatusCount(summary: ApplicationsKpiSummary, status: ApplicationStatus) {
  return summary.statusCounts[status];
}

export default async function ApplicationsPage({
  searchParams,
}: ApplicationsPageProps) {
  const session = await requireSession();
  const [applications, summary] = await Promise.all([
    fetchApplications(),
    fetchApplicationsSummary(),
  ]);
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const createdId = String(resolvedSearchParams.created ?? "");
  const errorCode = String(resolvedSearchParams.error ?? "");
  const statusUpdatedId = String(resolvedSearchParams.statusUpdated ?? "");
  const submittedUrl = String(resolvedSearchParams.url ?? "");
  const message = resolveMessage(errorCode || null);

  return (
    <AppShell
      breadcrumb="Candidatures"
      description="Suivez vos candidatures et importez de nouvelles offres."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/candidatures", session.role)}
      title="Candidatures"
      userEmail={session.email}
      userRole={session.role}
    >
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <Card>
            <CardHeader>
              <CardDescription>Total candidatures</CardDescription>
              <CardTitle>{summary.totalCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Taux de réponse</CardDescription>
              <CardTitle>{summary.responseRate}%</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Réponses obtenues</CardDescription>
              <CardTitle>{summary.respondedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Pipeline par statut</CardDescription>
              <CardTitle>
                {renderStatusCount(summary, "draft")} brouillon
                {renderStatusCount(summary, "draft") > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent style={{ color: "#6B6860", display: "grid", gap: "0.4rem" }}>
              <span>Envoyées: {renderStatusCount(summary, "sent")}</span>
              <span>
                Entretiens: {renderStatusCount(summary, "interview_scheduled")}
              </span>
              <span>Refus: {renderStatusCount(summary, "rejected")}</span>
              <span>
                Offres reçues: {renderStatusCount(summary, "offer_received")}
              </span>
            </CardContent>
          </Card>
        </div>

        {message ? (
          <p
            style={{
              backgroundColor: "#FBEAE7",
              border: "1px solid #E5B8AF",
              borderRadius: "0.75rem",
              color: "#8A2C20",
              lineHeight: 1.6,
              margin: 0,
              padding: "0.9rem 1rem",
            }}
          >
            {message}
          </p>
        ) : null}

        {createdId ? (
          <p
            style={{
              backgroundColor: "#EDF4EE",
              border: "1px solid #C9DCCF",
              borderRadius: "0.75rem",
              color: "#30543A",
              lineHeight: 1.6,
              margin: 0,
              padding: "0.9rem 1rem",
            }}
          >
            Brouillon cree pour {session.email}. Identifiant: {createdId}
          </p>
        ) : null}

        {statusUpdatedId ? (
          <p
            style={{
              backgroundColor: "#EDF4EE",
              border: "1px solid #C9DCCF",
              borderRadius: "0.75rem",
              color: "#30543A",
              lineHeight: 1.6,
              margin: 0,
              padding: "0.9rem 1rem",
            }}
          >
            Statut mis a jour pour la candidature {statusUpdatedId}.
          </p>
        ) : null}

        <Card>
          <CardContent style={{ paddingTop: "1.25rem" }}>
            <CandidaturesTable
              applications={applications}
              sessionEmail={session.email}
              submittedUrl={submittedUrl}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
