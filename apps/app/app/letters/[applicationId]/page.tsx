import React from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@cvforge/ui";
import type { LetterDocumentContent } from "@cvforge/types";
import { getServerApiUrl } from "../../auth-config";
import { requireSession } from "../../auth/session";
import { getAppNavigation } from "../../content";
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

export default async function LetterPage({ params }: LetterPageProps) {
  await requireSession();
  const { applicationId } = await params;
  const letterContent = await fetchLetterContent(applicationId);

  if (!letterContent) {
    notFound();
  }

  return (
    <AppShell
      description="Editez la lettre de motivation générée dans le template LM ATS par défaut."
      navigation={getAppNavigation("/candidatures")}
      title="Edition de la LM"
    >
      <LetterEditor applicationId={applicationId} letterContent={letterContent} />
    </AppShell>
  );
}
