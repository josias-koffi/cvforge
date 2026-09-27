import type {
  CVDocumentContent,
  CVDocumentVersionEntry,
  LetterDocumentContent,
  LetterDocumentVersionEntry,
} from "@cvforge/types";
import { NotFoundException } from "@nestjs/common";
import type {
  ApplicationsStore,
  StoredApplication,
} from "../applications/applications.types";

type Reader = Pick<ApplicationsStore, "findByIdForUserEmail">;

/**
 * The read side of a candidature's documents.
 *
 * Lifted out of `CvGenerationService`, which had grown past the 400-line
 * ceiling: these are plain lookups with no orchestration, and they were the
 * part carrying none of the service's real responsibility.
 */
export async function loadApplication(
  store: Reader,
  userEmail: string,
  applicationId: string,
): Promise<StoredApplication> {
  const application = await store.findByIdForUserEmail(userEmail, applicationId);

  if (!application) {
    throw new NotFoundException("La candidature est introuvable.");
  }

  return application;
}

export async function readCvContent(
  store: Reader,
  userEmail: string,
  applicationId: string,
): Promise<CVDocumentContent | null> {
  return (await loadApplication(store, userEmail, applicationId)).cvContent ?? null;
}

export async function readLetterContent(
  store: Reader,
  userEmail: string,
  applicationId: string,
): Promise<LetterDocumentContent | null> {
  return (
    (await loadApplication(store, userEmail, applicationId)).letterContent ?? null
  );
}

export async function readCvVersions(
  store: Reader,
  userEmail: string,
  applicationId: string,
): Promise<CVDocumentVersionEntry[]> {
  return latestFirst(
    (await loadApplication(store, userEmail, applicationId)).cvVersions,
  );
}

export async function readLetterVersions(
  store: Reader,
  userEmail: string,
  applicationId: string,
): Promise<LetterDocumentVersionEntry[]> {
  return latestFirst(
    (await loadApplication(store, userEmail, applicationId)).letterVersions,
  );
}

/** Most recent first: what every screen listing versions wants. */
function latestFirst<T extends { versionNumber: number }>(
  versions: T[] | undefined,
): T[] {
  return [...(versions ?? [])].sort(
    (left, right) => right.versionNumber - left.versionNumber,
  );
}
