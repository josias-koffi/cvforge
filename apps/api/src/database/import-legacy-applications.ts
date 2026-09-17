import { existsSync, readFileSync } from "node:fs";
import { normalizeStoredApplication } from "../applications/applications.normalize";
import type { StoredApplication } from "../applications/applications.types";
import type { Database } from "./database.types";
import {
  applicationCvVersions,
  applicationLetterVersions,
  applications,
  dataImports,
} from "./schema";

export const LEGACY_APPLICATIONS_IMPORT = "applications-state.json";

export type LegacyApplicationsImportResult =
  | { status: "already_imported" }
  | {
      status: "imported";
      applications: number;
      cvVersions: number;
      letterVersions: number;
      skipped: number;
    };

function readLegacyApplications(filePath: string): StoredApplication[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
    applications?: Record<string, StoredApplication>;
  };

  return Object.values(parsed.applications ?? {});
}

/**
 * Copies the JSON applications into Postgres once per environment, oldest
 * first.
 *
 * Every record goes through the store's own read-time repairs. That matters
 * beyond filling `not null` columns: the v1 document snapshot was synthesised
 * on each read from `cvContent` and never persisted, so without this the
 * version history of every pre-existing application would be lost.
 *
 * A record with no `id` or `userEmail` cannot be attributed to anyone, so it
 * is counted as skipped rather than imported under a blank owner. The count is
 * logged: a non-zero `skipped` means the row totals will not match the file,
 * which is the check the deploy runbook asks for. Production currently holds
 * none.
 *
 * A missing file is recorded as imported too: there is nothing left to copy.
 */
export async function importLegacyApplications(
  db: Database,
  filePath: string,
): Promise<LegacyApplicationsImportResult> {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .insert(dataImports)
      .values({ name: LEGACY_APPLICATIONS_IMPORT })
      .onConflictDoNothing()
      .returning({ name: dataImports.name });

    if (claimed.length === 0) {
      return { status: "already_imported" };
    }

    const legacy = readLegacyApplications(filePath).sort((left, right) =>
      (left.createdAt ?? "").localeCompare(right.createdAt ?? ""),
    );

    let imported = 0;
    let cvVersionCount = 0;
    let letterVersionCount = 0;
    let skipped = 0;

    for (const raw of legacy) {
      if (!raw?.id || !raw.userEmail) {
        skipped += 1;
        continue;
      }

      const application = normalizeStoredApplication(raw);

      await tx
        .insert(applications)
        .values({
          createdAt: new Date(application.createdAt),
          cvContent: application.cvContent,
          cvGeneratedAt: application.cvGeneratedAt
            ? new Date(application.cvGeneratedAt)
            : null,
          cvTemplateId: application.cvTemplateId ?? null,
          extracted: application.extracted,
          id: application.id,
          interviewReports: application.interviewReports ?? [],
          letterContent: application.letterContent,
          letterGeneratedAt: application.letterGeneratedAt
            ? new Date(application.letterGeneratedAt)
            : null,
          letterTemplateId: application.letterTemplateId ?? null,
          offerTextPreview: application.offerTextPreview ?? "",
          offerUrl: application.offerUrl ?? null,
          profileId: application.profileId ?? null,
          rawOfferText: application.rawOfferText ?? "",
          sourceLabel: application.sourceLabel ?? "",
          sourceType: application.sourceType,
          status: application.status,
          statusHistory: application.statusHistory,
          updatedAt: new Date(application.updatedAt),
          userEmail: application.userEmail,
        })
        .onConflictDoNothing();

      for (const version of application.cvVersions ?? []) {
        await tx
          .insert(applicationCvVersions)
          .values({
            applicationId: application.id,
            content: version.content,
            createdAt: new Date(version.createdAt),
            id: version.id,
            source: version.source,
            templateId: version.templateId,
            versionNumber: version.versionNumber,
          })
          .onConflictDoNothing();
        cvVersionCount += 1;
      }

      for (const version of application.letterVersions ?? []) {
        await tx
          .insert(applicationLetterVersions)
          .values({
            applicationId: application.id,
            content: version.content,
            createdAt: new Date(version.createdAt),
            id: version.id,
            source: version.source,
            templateId: version.templateId,
            versionNumber: version.versionNumber,
          })
          .onConflictDoNothing();
        letterVersionCount += 1;
      }

      imported += 1;
    }

    return {
      status: "imported",
      applications: imported,
      cvVersions: cvVersionCount,
      letterVersions: letterVersionCount,
      skipped,
    };
  });
}
