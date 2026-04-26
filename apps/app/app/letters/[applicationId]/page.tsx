import React from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@cvforge/ui";
import type {
  LetterDocumentContent,
  LetterDocumentVersionEntry,
} from "@cvforge/types";
import { getServerApiUrl } from "../../auth-config";
import { requireSession } from "../../auth/session";
import { getAppNavigation } from "../../content";
import { NotificationBell } from "../../notifications/notification-bell";
import { LetterEditor } from "./letter-editor";

type LetterPageProps = {
  params: Promise<{ applicationId: string }>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

async function fetchLetterContent(
  applicationId: string,
): Promise<LetterDocumentContent | null> {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const response = await fetch(
    `${getServerApiUrl()}/applications/${applicationId}/letter`,
    {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    letterContent: LetterDocumentContent;
  };
  return payload.letterContent;
}

async function fetchLetterVersions(
  applicationId: string,
): Promise<LetterDocumentVersionEntry[]> {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const response = await fetch(
    `${getServerApiUrl()}/applications/${applicationId}/letter/versions`,
    {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    },
  );

  if (!response.ok) return [];

  const payload = (await response.json()) as {
    versions: LetterDocumentVersionEntry[];
  };
  return Array.isArray(payload.versions) ? payload.versions : [];
}

export default async function LetterPage({ params }: LetterPageProps) {
  const session = await requireSession();
  const { applicationId } = await params;
  const [letterContent, versions] = await Promise.all([
    fetchLetterContent(applicationId),
    fetchLetterVersions(applicationId),
  ]);

  if (!letterContent) {
    notFound();
  }

  return (
    <AppShell
      breadcrumb="Documents · LM"
      description="Editez la lettre de motivation générée dans le template LM ATS par défaut."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/candidatures", session.role)}
      title="Edition de la LM"
      userEmail={session.email}
      userRole={session.role}
    >
      <LetterEditor
        applicationId={applicationId}
        letterContent={letterContent}
        versions={versions}
      />
    </AppShell>
  );
}
