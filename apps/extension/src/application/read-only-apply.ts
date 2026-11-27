import { APPLICATION_STATUS_SENT } from "@cvforge/types";
import { findApplicationFor, type ApplicationSummary } from "../domain/offer";
import type { ActiveTab } from "./preparation";
import type { JobSparkTools } from "./session";

/**
 * LinkedIn and Indeed (US-210): their terms forbid automation, so the
 * extension never fills nor clicks there. The candidate applies themselves
 * with the CV and letter JobSpark prepared, then marks the application sent.
 */
export type ReadOnlyOptions = {
  kind: "read-only";
  site: string;
  application: Pick<
    ApplicationSummary,
    "id" | "title" | "company" | "status"
  > | null;
  /** Which documents exist for that application. */
  documents: { cv: boolean; letter: boolean };
};

export async function readOnlyOptions(
  tools: JobSparkTools,
  tab: ActiveTab,
  site: string,
): Promise<ReadOnlyOptions> {
  const listed = await tools.call("list_applications").catch(() => []);
  const application = findApplicationFor(
    Array.isArray(listed) ? (listed as ApplicationSummary[]) : [],
    tab.url,
  );
  return {
    application: application && {
      company: application.company,
      id: application.id,
      status: application.status,
      title: application.title,
    },
    documents: {
      cv: Boolean(application?.cvGeneratedAt),
      letter: Boolean(application?.letterGeneratedAt),
    },
    kind: "read-only",
    site,
  };
}

/** A short-lived link to the PDF, opened in a new tab for the candidate. */
export async function documentLink(
  tools: JobSparkTools,
  applicationId: string,
  kind: "cv" | "letter",
): Promise<string> {
  const link = (await tools.call("get_document_download_url", {
    applicationId,
    format: "pdf",
    kind,
  })) as { url: string };
  return link.url;
}

/** « Je l'ai envoyée » : the candidate applied on the site themselves. */
export async function markSent(tools: JobSparkTools, applicationId: string) {
  await tools.call("update_application_status", {
    applicationId,
    status: APPLICATION_STATUS_SENT,
  });
  return { status: APPLICATION_STATUS_SENT };
}
