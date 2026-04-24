import React from "react";
import {
  AppShell,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cvforge/ui";
import { cookies } from "next/headers";
import {
  creditPackIds,
  creditPacks,
  type ApplicationsKpiSummary,
  type CreditLedgerSummary,
} from "@cvforge/types";
import Link from "next/link";
import { getAppUrl, getServerApiUrl } from "../auth-config";
import { requireSession } from "../auth/session";
import { appContent, getAppNavigation } from "../content";
import {
  applicationStatusOrder,
  getApplicationStatusLabel,
} from "../candidatures/status-metadata";
import { NotificationBell } from "../notifications/notification-bell";
import {
  buildAtsInsights,
  buildInterviewInsights,
  buildMonthlyTrend,
  buildStatusSegments,
  type DashboardApplication,
} from "./analytics";
import { DonutChartCard, LineChartCard } from "./charts";
import { DashboardShareCard } from "./share-card";
import { buildDashboardSharePageUrl, buildLinkedInShareUrl } from "./share-card-content";

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

async function fetchApplicationsSummary() {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const response = await fetch(`${getServerApiUrl()}/applications/summary`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new Error("Impossible de recuperer les KPI candidature.");
  }

  const payload = (await response.json()) as { summary: ApplicationsKpiSummary };

  return payload.summary;
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

  const payload = (await response.json()) as {
    applications: DashboardApplication[];
  };

  return payload.applications;
}

async function fetchCreditsSummary() {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const response = await fetch(`${getServerApiUrl()}/credits/me`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new Error("Impossible de recuperer le solde de credits.");
  }

  const payload = (await response.json()) as { credits: CreditLedgerSummary };

  return payload.credits;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function countApplicationsThisMonth(applications: DashboardApplication[]) {
  const now = new Date();

  return applications.filter((application) => {
    const createdAt = new Date(application.createdAt);

    return (
      createdAt.getFullYear() === now.getFullYear() &&
      createdAt.getMonth() === now.getMonth()
    );
  }).length;
}

function getRecentApplications(applications: DashboardApplication[]) {
  return [...applications]
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )
    .slice(0, 4);
}

function resolveBillingMessage(
  billingState: string,
  reason: string,
  packId: string,
) {
  if (billingState === "success") {
    const pack = creditPacks[packId as keyof typeof creditPacks];
    const packLabel = pack?.label ?? "selection";

    return `Paiement ${packLabel} termine. Le solde sera synchronise des confirmation Stripe.`;
  }

  if (billingState === "cancelled") {
    return "Le paiement a ete annule avant confirmation Stripe.";
  }

  if (billingState === "error") {
    if (reason === "invalid_pack") {
      return "Le pack selectionne est invalide.";
    }

    if (reason === "request_failed") {
      return "La creation du checkout Stripe a echoue. Reessayez dans un instant.";
    }

    return reason;
  }

  return null;
}

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function resolveSearchParams(
  searchParams: DashboardPageProps["searchParams"],
) {
  if (!searchParams) {
    return {};
  }

  return await searchParams;
}

export default async function DashboardPage(props: DashboardPageProps) {
  const { searchParams } = props ?? {};
  const session = await requireSession();
  const [summary, applications, credits] = await Promise.all([
    fetchApplicationsSummary(),
    fetchApplications(),
    fetchCreditsSummary(),
  ]);
  const applicationsThisMonth = countApplicationsThisMonth(applications);
  const recentApplications = getRecentApplications(applications);
  const monthlyTrend = buildMonthlyTrend(applications);
  const statusSegments = buildStatusSegments(
    applications,
    Object.fromEntries(
      applicationStatusOrder.map((status) => [status, getApplicationStatusLabel(status)]),
    ) as Record<(typeof applicationStatusOrder)[number], string>,
  );
  const atsInsights = buildAtsInsights(applications);
  const interviewInsights = buildInterviewInsights(applications);
  const shareData = {
    averageAtsScore: atsInsights.averageScore,
    averageInterviewScore: interviewInsights.averageScore,
    generatedAt: new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
    }).format(new Date()),
    interviewCount: summary.statusCounts.interview_scheduled,
    offerCount: summary.statusCounts.offer_received,
    responseRate: summary.responseRate,
    totalApplications: summary.totalCount,
  };
  const publicShareUrl = buildDashboardSharePageUrl(getAppUrl(), shareData);
  const linkedInShareUrl = buildLinkedInShareUrl(publicShareUrl);
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const billingState = String(resolvedSearchParams.billing ?? "");
  const billingReason = String(resolvedSearchParams.reason ?? "");
  const billingPackId = String(resolvedSearchParams.pack ?? "");
  const billingMessage = resolveBillingMessage(
    billingState,
    billingReason,
    billingPackId,
  );

  return (
    <AppShell
      title="Tableau de bord candidat"
      description="Point d'entree du parcours apres validation de l'onboarding et edition du profil."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/dashboard")}
    >
      <div style={{ display: "grid", gap: "1.5rem" }}>
        {billingMessage ? (
          <Card>
            <CardContent style={{ padding: "1rem 1.25rem" }}>
              <p style={{ color: "#2C2C2A", lineHeight: 1.6, margin: 0 }}>
                {billingMessage}
              </p>
            </CardContent>
          </Card>
        ) : null}

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
              <CardDescription>Candidatures ce mois</CardDescription>
              <CardTitle>{applicationsThisMonth}</CardTitle>
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
              <CardDescription>Entretiens planifies</CardDescription>
              <CardTitle>{summary.statusCounts.interview_scheduled}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Offres recues</CardDescription>
              <CardTitle>{summary.statusCounts.offer_received}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Credits restants</CardDescription>
              <CardTitle>{credits.balance}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Score ATS moyen</CardDescription>
              <CardTitle>
                {atsInsights.averageScore === null ? "--" : `${atsInsights.averageScore}/100`}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Score entretien moyen</CardDescription>
              <CardTitle>
                {interviewInsights.averageScore === null
                  ? "--"
                  : `${interviewInsights.averageScore}/100`}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline candidature</CardTitle>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              Les KPI de base sont maintenant derives du meme moteur de statuts que
              la page candidatures.
            </p>
          </CardHeader>
          <CardContent
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            {applicationStatusOrder.map((status) => (
              <div
                key={status}
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #D9D4CA",
                  borderRadius: "1rem",
                  display: "grid",
                  gap: "0.35rem",
                  padding: "1rem",
                }}
              >
                <strong style={{ color: "#1A1A18" }}>
                  {getApplicationStatusLabel(status)}
                </strong>
                <span style={{ color: "#6B6860" }}>
                  {summary.statusCounts[status]} candidature
                  {summary.statusCounts[status] > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics avancees</CardTitle>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              Vue detaillee des tendances candidature, de la repartition du pipeline
              et des scores disponibles dans les donnees produit.
            </p>
          </CardHeader>
          <CardContent
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            <LineChartCard
              color="#2C2C2A"
              emptyMessage="Aucune candidature n'est encore presente dans la periode observee."
              points={monthlyTrend}
              title="Evolution mensuelle"
            />
            <DonutChartCard segments={statusSegments} title="Repartition par statut" />
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #D9D4CA",
                borderRadius: "1rem",
                display: "grid",
                gap: "0.85rem",
                padding: "1rem",
              }}
            >
              <LineChartCard
                color="#A88B5C"
                emptyMessage="Les scores ATS apparaitront ici des qu'une candidature possedera des versions de CV exploitables."
                maxValue={100}
                points={atsInsights.points}
                title="Progression ATS"
              />
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                {atsInsights.focusApplicationTitle
                  ? `Candidature suivie: ${atsInsights.focusApplicationTitle}`
                  : "Aucune candidature ne dispose encore d'un historique ATS exploitable."}
              </p>
              {atsInsights.latestScores.length > 0 ? (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {atsInsights.latestScores.map((entry) => (
                    <div
                      key={entry.applicationId}
                      style={{
                        alignItems: "center",
                        display: "flex",
                        gap: "0.75rem",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#1A1A18" }}>{entry.title}</span>
                      <span style={{ color: "#6B6860" }}>
                        {entry.score}/100 · {entry.versionCount} version
                        {entry.versionCount > 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <LineChartCard
              color="#4A7C59"
              emptyMessage="Les scores post-entretien seront traces ici des que les rapports d'entretien seront sauvegardes."
              maxValue={100}
              points={interviewInsights.points}
              title="Scores post-entretien"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acces rapides</CardTitle>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              Raccourcis vers les actions les plus frequentes du candidat.
            </p>
          </CardHeader>
          <CardContent
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <Link
              href="/candidatures"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #D9D4CA",
                borderRadius: "1rem",
                color: "#2C2C2A",
                display: "grid",
                gap: "0.5rem",
                padding: "1rem",
                textDecoration: "none",
              }}
            >
              <strong>Nouvelle candidature</strong>
              <span style={{ color: "#6B6860" }}>
                Importer une offre puis lancer le pipeline CVforge.
              </span>
            </Link>
            <Link
              href="/credits"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #D9D4CA",
                borderRadius: "1rem",
                color: "#2C2C2A",
                display: "grid",
                gap: "0.5rem",
                padding: "1rem",
                textDecoration: "none",
              }}
            >
              <strong>Acheter des credits</strong>
              <span style={{ color: "#6B6860" }}>
                Recharger le solde ou consulter le ledger complet.
              </span>
            </Link>
            <Link
              href="/profile"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #D9D4CA",
                borderRadius: "1rem",
                color: "#2C2C2A",
                display: "grid",
                gap: "0.5rem",
                padding: "1rem",
                textDecoration: "none",
              }}
            >
              <strong>Mettre a jour mon profil</strong>
              <span style={{ color: "#6B6860" }}>
                Garder le profil de base pret pour les prochaines generations.
              </span>
            </Link>
            <Link
              href="/interview"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #D9D4CA",
                borderRadius: "1rem",
                color: "#2C2C2A",
                display: "grid",
                gap: "0.5rem",
                padding: "1rem",
                textDecoration: "none",
              }}
            >
              <strong>Mode interview</strong>
              <span style={{ color: "#6B6860" }}>
                Reprendre les entretiens planifies et l'entrainement vocal.
              </span>
            </Link>
          </CardContent>
        </Card>

        <DashboardShareCard
          data={shareData}
          linkedInShareUrl={linkedInShareUrl}
          publicShareUrl={publicShareUrl}
        />

        <Card>
          <CardHeader>
            <CardTitle>Dernieres candidatures</CardTitle>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              Liste courte des candidatures les plus recentes pour reprendre vite.
            </p>
          </CardHeader>
          <CardContent style={{ display: "grid", gap: "1rem" }}>
            {recentApplications.length === 0 ? (
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Aucune candidature enregistree pour le moment.
              </p>
            ) : (
              recentApplications.map((application) => (
                <div
                  key={application.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #D9D4CA",
                    borderRadius: "1rem",
                    display: "grid",
                    gap: "0.5rem",
                    padding: "1rem",
                  }}
                >
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                      justifyContent: "space-between",
                    }}
                  >
                    <strong style={{ color: "#1A1A18" }}>
                      {application.extracted.title}
                    </strong>
                    <span style={{ color: "#6B6860" }}>
                      {getApplicationStatusLabel(application.status)}
                    </span>
                  </div>
                  <span style={{ color: "#6B6860" }}>
                    {application.extracted.companyName ?? application.sourceLabel}
                  </span>
                  <span style={{ color: "#6B6860" }}>
                    Mise a jour: {formatDate(application.updatedAt)}
                  </span>
                </div>
              ))
            )}
            <Link href="/candidatures" style={{ color: "#2C2C2A", fontWeight: 600 }}>
              Ouvrir le pipeline de candidatures
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acheter des credits</CardTitle>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              Checkout Stripe heberge pour les packs one-shot du MVP.
            </p>
          </CardHeader>
          <CardContent
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <Link
              href="/credits"
              style={{ color: "#2C2C2A", fontWeight: 600, gridColumn: "1 / -1" }}
            >
              Ouvrir la page Mes credits
            </Link>
            {creditPackIds.map((packId) => {
              const pack = creditPacks[packId];

              return (
                <form
                  key={pack.id}
                  action="/credits/checkout"
                  method="POST"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #D9D4CA",
                    borderRadius: "1rem",
                    display: "grid",
                    gap: "0.75rem",
                    padding: "1rem",
                  }}
                >
                  <input name="packId" type="hidden" value={pack.id} />
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <strong style={{ color: "#1A1A18", fontSize: "1.05rem" }}>
                      Pack {pack.label}
                    </strong>
                    <span style={{ color: "#6B6860" }}>
                      {(pack.priceCents / 100).toLocaleString("fr-FR", {
                        currency: "EUR",
                        style: "currency",
                      })}{" "}
                      TTC
                    </span>
                    <span style={{ color: "#6B6860" }}>{pack.credits} credits</span>
                  </div>
                  <Button type="submit">Acheter le pack {pack.label}</Button>
                </form>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profil de base pret a etre enrichi</CardTitle>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              L&apos;onboarding alimente maintenant un premier profil socle que le candidat
              peut dupliquer, specialiser et reutiliser avant les futures generations IA.
            </p>
          </CardHeader>
          <CardContent style={{ display: "grid", gap: "1rem" }}>
            <dl
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #D9D4CA",
                borderRadius: "1rem",
                display: "grid",
                gap: "0.5rem",
                margin: 0,
                padding: "1.25rem",
              }}
            >
              <dt style={{ color: "#6B6860", fontWeight: 600 }}>Session</dt>
              <dd style={{ margin: 0 }}>{session.email}</dd>
              <dt style={{ color: "#6B6860", fontWeight: 600 }}>Role</dt>
              <dd style={{ margin: 0 }}>{session.role}</dd>
            </dl>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              Les candidatures peuvent desormais pointer vers des profils differents
              pour adapter le CV et la lettre au bon contexte.
            </p>
            <Link href="/candidatures" style={{ color: "#2C2C2A", fontWeight: 600 }}>
              Ouvrir le pipeline de candidatures
            </Link>
            <Link href="/profile" style={{ color: "#2C2C2A", fontWeight: 600 }}>
              Ouvrir le profil de base
            </Link>
            <Link href="/" style={{ color: "#2C2C2A", fontWeight: 600 }}>
              Reprendre l&apos;onboarding
            </Link>
            <p style={{ color: "#6B6860", margin: 0 }}>{appContent.description}</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
