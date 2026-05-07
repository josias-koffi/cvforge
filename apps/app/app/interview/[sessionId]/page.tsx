import React from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@cvforge/ui";
import type { DraftApplication, InterviewSessionSummary } from "@cvforge/types";
import { getServerApiUrl } from "../../auth-config";
import { requireSession } from "../../auth/session";
import { getAppNavigation } from "../../content";
import { NotificationBell } from "../../notifications/notification-bell";
import { InterviewStudio } from "../interview-studio";

type InterviewSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

async function fetchSession(sessionId: string): Promise<InterviewSessionSummary | null> {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const response = await fetch(`${getServerApiUrl()}/interviews/sessions/${sessionId}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (response.status === 404) return null;
  if (!response.ok) return null;

  return (await response.json()) as InterviewSessionSummary;
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

export default async function InterviewSessionPage({ params }: InterviewSessionPageProps) {
  const session = await requireSession();
  const { sessionId } = await params;

  const [interviewSession, applications] = await Promise.all([
    fetchSession(sessionId),
    fetchApplications(),
  ]);

  if (!interviewSession) {
    notFound();
  }

  const eligibleApplications = applications
    .filter((app) => app.status !== "draft")
    .map((app) => ({
      companyName: app.extracted.companyName,
      id: app.id,
      status: app.status,
      title: app.extracted.title ?? "Candidature",
    }));

  return (
    <AppShell
      breadcrumb="Interview · Session"
      description="Session d'entretien vocal en cours."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/interview", session.role)}
      title="Entretien vocal"
      userEmail={session.email}
      userRole={session.role}
    >
      <InterviewStudio
        applications={eligibleApplications}
        preloadedSessionId={sessionId}
        sessionEmail={session.email}
      />
    </AppShell>
  );
}
