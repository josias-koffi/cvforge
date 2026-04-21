import React from "react";
import {
  AppShell,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@cvforge/ui";
import { cookies } from "next/headers";
import { creditPackIds, creditPacks, type ApplicationsKpiSummary } from "@cvforge/types";
import Link from "next/link";
import { getServerApiUrl } from "../auth-config";
import { requireSession } from "../auth/session";
import { appContent, getAppNavigation } from "../content";
import {
  applicationStatusOrder,
  getApplicationStatusLabel,
} from "../candidatures/status-metadata";

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
  const summary = await fetchApplicationsSummary();
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
              <CardTitle>{summary.totalCount}</CardTitle>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Total candidatures
              </p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{summary.responseRate}%</CardTitle>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Taux de reponse
              </p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{summary.respondedCount}</CardTitle>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Reponses obtenues
              </p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{summary.statusCounts.offer_received}</CardTitle>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Offres recues
              </p>
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
              L&apos;onboarding alimente maintenant un profil de base unique que le candidat
              peut consulter et editer avant les futures generations IA.
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
              Le MVP conserve un seul profil de base par compte pour rester aligne
              avec la contrainte sprint avant l'ouverture du multi-profils.
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
