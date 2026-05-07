import React from "react";
import { cookies } from "next/headers";
import { AppShell } from "@cvforge/ui";
import type { DraftApplication } from "@cvforge/types";
import { getServerApiUrl } from "../../auth-config";
import { requireSession } from "../../auth/session";
import { getAppNavigation } from "../../content";
import { NotificationBell } from "../../notifications/notification-bell";
import { InterviewSetupWizard } from "./interview-setup-wizard";

type InterviewNewPageProps = {
  searchParams: Promise<{ candidatureId?: string }>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

async function fetchApplications(): Promise<DraftApplication[]> {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const response = await fetch(`${getServerApiUrl()}/applications`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as { applications: DraftApplication[] };
  return payload.applications;
}

export default async function InterviewNewPage({ searchParams }: InterviewNewPageProps) {
  const session = await requireSession();
  const { candidatureId } = await searchParams;
  const applications = await fetchApplications();

  const eligibleApplications = applications
    .filter((app) => app.status !== "draft")
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .map((app) => ({
      companyName: app.extracted.companyName,
      id: app.id,
      title: app.extracted.title ?? "Candidature",
    }));

  const initialCandidatureId =
    candidatureId && eligibleApplications.some((app) => app.id === candidatureId)
      ? candidatureId
      : "";

  return (
    <AppShell
      breadcrumb="Interview · Nouveau setup"
      description="Configurez votre session d'entretien en 3 étapes."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/interview", session.role)}
      title="Préparer un entretien"
      userEmail={session.email}
      userRole={session.role}
    >
      <InterviewSetupWizard
        applications={eligibleApplications}
        initialCandidatureId={initialCandidatureId}
      />
    </AppShell>
  );
}
