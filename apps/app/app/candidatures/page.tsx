import React from "react";
import { cookies } from "next/headers";
import {
  AppShell,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@cvforge/ui";
import type { DraftApplication } from "@cvforge/types";
import { getServerApiUrl } from "../auth-config";
import { requireSession } from "../auth/session";
import { getAppNavigation } from "../content";

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

function resolveMessage(errorCode: string | null) {
  switch (errorCode) {
    case "invalid_url":
      return "L'URL fournie est invalide. Collez une URL http ou https complete.";
    case "unreachable":
      return "Le site de l'offre n'a pas pu etre recupere depuis le serveur.";
    case "unprocessable":
      return "Le scraping a reussi, mais le contenu recupere est insuffisant pour creer une candidature.";
    case "request_failed":
      return "L'import de l'offre a echoue. Reessayez dans un instant.";
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

export default async function ApplicationsPage({
  searchParams,
}: ApplicationsPageProps = {}) {
  const session = await requireSession();
  const applications = await fetchApplications();
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const createdId = String(resolvedSearchParams.created ?? "");
  const errorCode = String(resolvedSearchParams.error ?? "");
  const submittedUrl = String(resolvedSearchParams.url ?? "");
  const message = resolveMessage(errorCode || null);

  return (
    <AppShell
      title="Candidatures"
      description="Importez une offre depuis son URL pour creer un brouillon de candidature avec les champs essentiels deja extraits."
      navigation={getAppNavigation("/candidatures")}
    >
      <div style={{ display: "grid", gap: "1.5rem" }}>
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
                  <CardTitle>{application.extracted.title}</CardTitle>
                  <CardDescription>
                    {application.extracted.companyName ?? "Entreprise non detectee"} ·{" "}
                    {application.extracted.location ?? "Localisation non detectee"} ·
                    {" "}Brouillon
                  </CardDescription>
                </CardHeader>
                <CardContent style={{ display: "grid", gap: "1rem" }}>
                  <p style={{ color: "#1A1A18", lineHeight: 1.7, margin: 0 }}>
                    {application.extracted.summary}
                  </p>
                  <dl
                    style={{
                      display: "grid",
                      gap: "0.75rem",
                      margin: 0,
                    }}
                  >
                    <div>
                      <dt style={{ color: "#6B6860", fontWeight: 600 }}>Source</dt>
                      <dd style={{ margin: 0 }}>{application.offerUrl}</dd>
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
                      <dt style={{ color: "#6B6860", fontWeight: 600 }}>
                        Apercu du texte scrape
                      </dt>
                      <dd style={{ margin: 0 }}>{application.offerTextPreview}</dd>
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
