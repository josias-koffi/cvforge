import React from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@cvforge/ui";
import type { DraftApplication } from "@cvforge/types";
import { getServerApiUrl } from "../../auth-config";
import { requireSession } from "../../auth/session";
import { getAppNavigation } from "../../content";
import { NotificationBell } from "../../notifications/notification-bell";
import { CandidatureDetailTabs } from "./candidature-detail-tabs";

type CandidatureDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    statusUpdated?: string;
  }>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

async function fetchApplication(id: string): Promise<DraftApplication | null> {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const response = await fetch(`${getServerApiUrl()}/applications/${id}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (response.status === 404) return null;
  if (!response.ok) return null;

  const payload = (await response.json()) as { application: DraftApplication };
  return payload.application;
}

export default async function CandidatureDetailPage({
  params,
  searchParams,
}: CandidatureDetailPageProps) {
  const session = await requireSession();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const application = await fetchApplication(id);

  if (!application) {
    notFound();
  }

  const title = application.extracted.title ?? "Candidature";

  return (
    <AppShell
      breadcrumb={`Candidatures · ${title}`}
      description={`Détail de la candidature — ${title}`}
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/candidatures", session.role)}
      title={title}
      userEmail={session.email}
      userRole={session.role}
    >
      <CandidatureDetailTabs
        application={application}
        sessionEmail={session.email}
        statusError={query.error}
        statusUpdated={query.statusUpdated === application.id}
      />
    </AppShell>
  );
}
