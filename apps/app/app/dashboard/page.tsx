import React from "react";
import { AppShell, Card, CardContent } from "@cvforge/ui";
import { cookies } from "next/headers";
import {
  creditPacks,
  type ApplicationsKpiSummary,
  type CreditLedgerSummary,
  type DraftApplication,
} from "@cvforge/types";
import { getServerApiUrl } from "../auth-config";
import { requireSession } from "../auth/session";
import { getAppNavigation } from "../content";
import { NotificationBell } from "../notifications/notification-bell";
import { KpiRow } from "./kpi-row";
import { RecentTables } from "./recent-tables";
import { QuickActions } from "./quick-actions";

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
    applications: DraftApplication[];
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
      breadcrumb="Dashboard"
      description="Point d'entree du parcours apres validation de l'onboarding et edition du profil."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/dashboard", session.role)}
      title="Tableau de bord candidat"
      userEmail={session.email}
      userRole={session.role}
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

        <KpiRow applications={applications} credits={credits} summary={summary} />
        <RecentTables applications={applications} />
        <QuickActions />
      </div>
    </AppShell>
  );
}
