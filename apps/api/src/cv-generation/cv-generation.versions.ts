import type {
  CVDocumentContent,
  CVDocumentVersionEntry,
  LetterDocumentContent,
  LetterDocumentVersionEntry,
} from "@cvforge/types";
import type { StoredApplication } from "../applications/applications.types";

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
