import React from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@cvforge/ui";
import type { CVDocumentContent } from "@cvforge/types";
import { getServerApiUrl } from "../../auth-config";
import { requireSession } from "../../auth/session";
import { getAppNavigation } from "../../content";
import { cvContentToPuckData } from "./cv-content-to-puck";
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

export default async function CvPage({ params }: CvPageProps) {
  await requireSession();
  const { applicationId } = await params;
  const cvContent = await fetchCvContent(applicationId);

  if (!cvContent) {
    notFound();
  }

  const puckData = cvContentToPuckData(cvContent);

  return (
    <AppShell
      description="Editez le CV généré dans une structure WYSIWYG compatible avec l'export PDF."
      navigation={getAppNavigation("/candidatures")}
      title="Edition du CV"
    >
      <CvEditor applicationId={applicationId} puckData={puckData} />
    </AppShell>
  );
}
