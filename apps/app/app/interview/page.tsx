import React from "react";
import { cookies } from "next/headers";
import { AppShell } from "@cvforge/ui";
import type { DraftApplication } from "@cvforge/types";
import { getServerApiUrl } from "../auth-config";
import { requireSession } from "../auth/session";
import { getAppNavigation } from "../content";
import { NotificationBell } from "../notifications/notification-bell";
import { InterviewStudio } from "./interview-studio";

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

export default async function InterviewPage() {
  const session = await requireSession();
  const applications = await fetchApplications();
  const interviewApplications = applications
    .filter((application) => application.status !== "draft")
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )
    .map((application) => ({
      companyName: application.extracted.companyName,
      id: application.id,
      status: application.status,
      title: application.extracted.title,
    }));

  return (
    <AppShell
      breadcrumb="Interview"
      description="Prototype V1.2 du pipeline interview vocal: capture navigateur, ingestion backend et STT progressif."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/interview", session.role)}
      title="Interview vocal"
      userEmail={session.email}
      userRole={session.role}
    >
      <InterviewStudio
        applications={interviewApplications}
        sessionEmail={session.email}
      />
    </AppShell>
  );
}
