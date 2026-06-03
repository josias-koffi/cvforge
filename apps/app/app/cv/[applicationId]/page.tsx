import React from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@cvforge/ui";
import type { CVDocumentContent, CVDocumentVersionEntry } from "@cvforge/types";
import { getServerApiUrl } from "../../auth-config";
import { requireSession } from "../../auth/session";
import { getAppNavigation } from "../../content";
import { NotificationBell } from "../../notifications/notification-bell";
import { CvEditor } from "./cv-editor";

type CvPageProps = {
  params: Promise<{ applicationId: string }>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

async function fetchCvContent(
  applicationId: string,
): Promise<CVDocumentContent | null> {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const response = await fetch(
    `${getServerApiUrl()}/applications/${applicationId}/cv`,
    {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) return null;

  const payload = (await response.json()) as { cvContent: CVDocumentContent };
  return payload.cvContent;
}

async function fetchCvVersions(
  applicationId: string,
): Promise<CVDocumentVersionEntry[]> {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const response = await fetch(
    `${getServerApiUrl()}/applications/${applicationId}/cv/versions`,
    {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    },
  );

  if (!response.ok) return [];

  const payload = (await response.json()) as {
    versions: CVDocumentVersionEntry[];
  };
  return Array.isArray(payload.versions) ? payload.versions : [];
}

export default async function CvPage({ params }: CvPageProps) {
  const session = await requireSession();
  const { applicationId } = await params;
  const [cvContent, versions] = await Promise.all([
    fetchCvContent(applicationId),
    fetchCvVersions(applicationId),
  ]);

  if (!cvContent) {
    notFound();
  }

  return (
    <AppShell
      breadcrumb="Documents · CV"
      description="Editez les champs du CV généré et contrôlez le rendu avant export."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/candidatures", session.role)}
      title="Edition du CV"
      userEmail={session.email}
      userRole={session.role}
    >
      <CvEditor
        applicationId={applicationId}
        cvContent={cvContent}
        versions={versions}
      />
    </AppShell>
  );
}
