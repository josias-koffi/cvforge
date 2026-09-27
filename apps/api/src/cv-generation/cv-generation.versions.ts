import type { AtsScoreResult } from "@cvforge/ats-score";
import type {
  CVDocumentContent,
  CVDocumentVersionEntry,
  LetterDocumentContent,
  LetterDocumentVersionEntry,
} from "@cvforge/types";
import type {
  TEMPLATE_KIND_CV,
  TEMPLATE_KIND_LETTER,
} from "@cvforge/types";
import type { StoredApplication } from "../applications/applications.types";
import type { TemplatesStore } from "../templates/templates.types";

function nextVersionNumber(
  versions: Array<{ versionNumber: number }> | undefined,
) {
  return (
    (versions?.reduce(
      (highest, version) => Math.max(highest, version.versionNumber),
      0,
    ) ?? 0) + 1
  );
}

export function appendCvVersion(
  application: StoredApplication,
  content: CVDocumentContent,
  timestamp: string,
  source: CVDocumentVersionEntry["source"],
  templateId: string | null,
): CVDocumentVersionEntry[] {
  const versions = application.cvVersions ?? [];
  const versionNumber = nextVersionNumber(versions);

  return [
    ...versions,
    {
      content,
      createdAt: timestamp,
      id: `${application.id}-cv-v${versionNumber}`,
      source,
      templateId,
      versionNumber,
    },
  ];
}

/**
 * Stamps the score on the version that was just appended.
 *
 * Only the number and the scale are kept per version: the full result lives on
 * the application, and the chart of progression (vision §12.3) reads a column.
 * A failed scoring leaves the version unstamped rather than recording a zero.
 */
export function withScore(
  versions: CVDocumentVersionEntry[],
  score: AtsScoreResult | null,
): CVDocumentVersionEntry[] {
  if (!score || versions.length === 0) return versions;

  const last = versions[versions.length - 1]!;

  return [
    ...versions.slice(0, -1),
    {
      ...last,
      atsEngineVersion: score.engineVersion,
      atsScore: score.overallScore,
    },
  ];
}

export function appendLetterVersion(
  application: StoredApplication,
  content: LetterDocumentContent,
  timestamp: string,
  source: LetterDocumentVersionEntry["source"],
  templateId: string | null,
): LetterDocumentVersionEntry[] {
  const versions = application.letterVersions ?? [];
  const versionNumber = nextVersionNumber(versions);

  return [
    ...versions,
    {
      content,
      createdAt: timestamp,
      id: `${application.id}-letter-v${versionNumber}`,
      source,
      templateId,
      versionNumber,
    },
  ];
}

/** The default template of that kind, or the first one; null without any. */
export async function defaultTemplateId(
  templatesStore: Pick<TemplatesStore, "list"> | undefined,
  kind: typeof TEMPLATE_KIND_CV | typeof TEMPLATE_KIND_LETTER,
) {
  const templates = (await templatesStore?.list()) ?? [];
  const defaultTemplate =
    templates.find((template) => template.kind === kind && template.isDefault) ??
    templates.find((template) => template.kind === kind);

  return defaultTemplate?.id ?? null;
}
