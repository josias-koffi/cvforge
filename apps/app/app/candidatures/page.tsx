import React from "react";
import { cookies } from "next/headers";
import {
  type ApplicationsKpiSummary,
  type ApplicationStatus,
  AppShell,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@cvforge/ui";
import type { DraftApplication } from "@cvforge/types";
import { getServerApiUrl } from "../auth-config";
import { requireSession } from "../auth/session";
import { getAppNavigation } from "../content";
import {
  applicationStatusActionLabels,
  applicationStatusTransitions,
  getApplicationStatusLabel,
  getApplicationStatusTone,
} from "./status-metadata";

type ApplicationsPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
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

  return searchParams instanceof Promise ? await searchParams : searchParams;
}

function renderArray(values: string[]) {
  if (values.length === 0) {
    return <span style={{ color: "#6B6860" }}>Non detecte</span>;
  }

  return (
    <ul style={{ display: "grid", gap: "0.35rem", margin: 0, paddingLeft: "1.25rem" }}>
      {values.map((value) => (
        <li key={value}>{value}</li>
      ))}
    </ul>
  );
}

function renderDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function renderStatusCount(summary: ApplicationsKpiSummary, status: ApplicationStatus) {
  return summary.statusCounts[status];
}

export default async function ApplicationsPage({
  searchParams,
}: ApplicationsPageProps = {}) {
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
      title="Candidatures"
      description="Importez une offre depuis son URL pour creer un brouillon de candidature avec les champs essentiels deja extraits."
      navigation={getAppNavigation("/candidatures")}
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
              <CardDescription>Taux de reponse</CardDescription>
              <CardTitle>{summary.responseRate}%</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Reponses obtenues</CardDescription>
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
              <span>Envoyees: {renderStatusCount(summary, "sent")}</span>
              <span>
                Entretiens: {renderStatusCount(summary, "interview_scheduled")}
              </span>
              <span>Refus: {renderStatusCount(summary, "rejected")}</span>
              <span>
                Offres recues: {renderStatusCount(summary, "offer_received")}
              </span>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Importer une offre</CardTitle>
            <CardDescription>
              CVforge tente un scraping serveur de l&apos;offre puis extrait les
              champs utiles a la candidature via OpenRouter conforme RGPD.
            </CardDescription>
          </CardHeader>
          <CardContent style={{ display: "grid", gap: "1rem" }}>
            <form
              action="/candidatures/import"
              method="POST"
              style={{ display: "grid", gap: "0.875rem" }}
            >
              <input name="sourceType" type="hidden" value="url" />
              <div style={{ display: "grid", gap: "0.4rem" }}>
                <Label htmlFor="offerUrl">URL de l&apos;offre</Label>
                <Input
                  defaultValue={submittedUrl}
                  id="offerUrl"
                  name="offerUrl"
                  placeholder="https://entreprise.example/jobs/123"
                  required
                  type="url"
                />
              </div>
              <Button type="submit">Creer un brouillon</Button>
            </form>
            <div
              style={{
                borderTop: "1px solid #D8D2C8",
                display: "grid",
                gap: "0.75rem",
                paddingTop: "1rem",
              }}
            >
              <div style={{ display: "grid", gap: "0.35rem" }}>
                <strong style={{ color: "#1A1A18" }}>Fallback texte</strong>
                <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                  Si le site bloque le scraping ou si vous n&apos;avez qu&apos;un copier-coller
                  de l&apos;offre, collez son texte complet ici pour creer le meme
                  brouillon de candidature.
                </p>
              </div>
              <form
                action="/candidatures/import"
                method="POST"
                style={{ display: "grid", gap: "0.875rem" }}
              >
                <input name="sourceType" type="hidden" value="text" />
                <div style={{ display: "grid", gap: "0.4rem" }}>
                  <Label htmlFor="offerText">Texte de l&apos;offre</Label>
                  <Textarea
                    id="offerText"
                    name="offerText"
                    placeholder="Collez ici le texte integral de l'offre..."
                    required
                    rows={8}
                  />
                </div>
                <Button type="submit" variant="secondary">
                  Creer depuis le texte
                </Button>
              </form>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Import PDF MVP: reporte pour le moment. Le produit reste utilisable
                avec l&apos;URL et le fallback texte pendant que l&apos;ingestion PDF est
                cadree dans un futur lot.
              </p>
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
          </CardContent>
        </Card>

        <div style={{ display: "grid", gap: "1rem" }}>
          {applications.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Aucun brouillon pour le moment</CardTitle>
                <CardDescription>
                  Importez une premiere offre pour initialiser votre pipeline de candidature.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            applications.map((application) => (
              <Card key={application.id}>
                <CardHeader>
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <CardTitle>{application.extracted.title}</CardTitle>
                      <CardDescription>
                        {application.extracted.companyName ?? "Entreprise non detectee"} ·{" "}
                        {application.extracted.location ?? "Localisation non detectee"}
                      </CardDescription>
                    </div>
                    <span
                      style={{
                        ...getApplicationStatusTone(application.status),
                        border: "1px solid",
                        borderRadius: "999px",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        padding: "0.45rem 0.8rem",
                      }}
                    >
                      {getApplicationStatusLabel(application.status)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent style={{ display: "grid", gap: "1rem" }}>
                  <p style={{ color: "#1A1A18", lineHeight: 1.7, margin: 0 }}>
                    {application.extracted.summary}
                  </p>
                  <div
                    style={{
                      border: "1px solid #D9D4CA",
                      borderRadius: "0.9rem",
                      display: "grid",
                      gap: "0.85rem",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <strong style={{ color: "#1A1A18" }}>Transitions de statut</strong>
                      <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                        Les changements sont manuels et suivent le pipeline metier du
                        MVP. Chaque transition ajoute une entree horodatee.
                      </p>
                    </div>
                    {applicationStatusTransitions[application.status].length === 0 ? (
                      <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                        Cette candidature est dans un statut terminal.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                        {applicationStatusTransitions[application.status].map(
                          (nextStatus) => (
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
                              <input
                                name="nextStatus"
                                type="hidden"
                                value={nextStatus}
                              />
                              <Button type="submit" variant="secondary">
                                {applicationStatusActionLabels[nextStatus]}
                              </Button>
                            </form>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                  <dl
                    style={{
                      display: "grid",
                      gap: "0.75rem",
                      margin: 0,
                    }}
                  >
                    <div>
                      <dt style={{ color: "#6B6860", fontWeight: 600 }}>Source</dt>
                      <dd style={{ margin: 0 }}>{application.sourceLabel}</dd>
                    </div>
                    <div>
                      <dt style={{ color: "#6B6860", fontWeight: 600 }}>Contrat</dt>
                      <dd style={{ margin: 0 }}>
                        {application.extracted.contractType ?? "Non detecte"}
                      </dd>
                    </div>
                    <div>
                      <dt style={{ color: "#6B6860", fontWeight: 600 }}>Salaire</dt>
                      <dd style={{ margin: 0 }}>
                        {application.extracted.salaryRange ?? "Non detecte"}
                      </dd>
                    </div>
                    <div>
                      <dt style={{ color: "#6B6860", fontWeight: 600 }}>Langue</dt>
                      <dd style={{ margin: 0 }}>{application.extracted.language}</dd>
                    </div>
                    <div>
                      <dt style={{ color: "#6B6860", fontWeight: 600 }}>
                        Responsabilites
                      </dt>
                      <dd style={{ margin: 0 }}>
                        {renderArray(application.extracted.responsibilities)}
                      </dd>
                    </div>
                    <div>
                      <dt style={{ color: "#6B6860", fontWeight: 600 }}>
                        Exigences
                      </dt>
                      <dd style={{ margin: 0 }}>
                        {renderArray(application.extracted.requirements)}
                      </dd>
                    </div>
                    <div>
                      <dt style={{ color: "#6B6860", fontWeight: 600 }}>Statut</dt>
                      <dd style={{ margin: 0 }}>
                        {getApplicationStatusLabel(application.status)}
                      </dd>
                    </div>
                    <div>
                      <dt style={{ color: "#6B6860", fontWeight: 600 }}>
                        Derniere mise a jour
                      </dt>
                      <dd style={{ margin: 0 }}>{renderDate(application.updatedAt)}</dd>
                    </div>
                    <div>
                      <dt style={{ color: "#6B6860", fontWeight: 600 }}>
                        Apercu du texte scrape
                      </dt>
                      <dd style={{ margin: 0 }}>{application.offerTextPreview}</dd>
                    </div>
                    <div>
                      <dt style={{ color: "#6B6860", fontWeight: 600 }}>
                        Historique des statuts
                      </dt>
                      <dd style={{ margin: 0 }}>
                        <ul
                          style={{
                            display: "grid",
                            gap: "0.35rem",
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
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
