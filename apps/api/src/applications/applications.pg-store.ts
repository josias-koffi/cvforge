import type {
  CVDocumentVersionEntry,
  LetterDocumentVersionEntry,
} from "@cvforge/types";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  applicationCvVersions,
  applicationLetterVersions,
  applications,
} from "../database/schema";
import type { ApplicationsStore, StoredApplication } from "./applications.types";

type ApplicationRow = typeof applications.$inferSelect;
type CvVersionRow = typeof applicationCvVersions.$inferSelect;
type LetterVersionRow = typeof applicationLetterVersions.$inferSelect;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

function toCvVersion(row: CvVersionRow): CVDocumentVersionEntry {
  return {
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    source: row.source,
    templateId: row.templateId,
    versionNumber: row.versionNumber,
    // Null on every version generated before the score shipped: absent means
    // "not measured", never zero.
    ...(row.atsScore !== null ? { atsScore: row.atsScore } : {}),
    ...(row.atsEngineVersion !== null
      ? { atsEngineVersion: row.atsEngineVersion }
      : {}),
  };
}

function toLetterVersion(row: LetterVersionRow): LetterDocumentVersionEntry {
  return {
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    source: row.source,
    templateId: row.templateId,
    versionNumber: row.versionNumber,
  };
}

function toApplication(
  row: ApplicationRow,
  cvVersions: CVDocumentVersionEntry[],
  letterVersions: LetterDocumentVersionEntry[],
): StoredApplication {
  return {
    createdAt: row.createdAt.toISOString(),
    cvContent: row.cvContent ?? null,
    cvGeneratedAt: row.cvGeneratedAt?.toISOString() ?? null,
    cvTemplateId: row.cvTemplateId,
    cvVersions,
    atsScore: row.atsScore ?? null,
    extracted: row.extracted,
    id: row.id,
    interviewReports: row.interviewReports,
    companyContext: row.companyContext ?? null,
    companyContextGeneratedAt:
      row.companyContextGeneratedAt?.toISOString() ?? null,
    letterContent: row.letterContent ?? null,
    letterGeneratedAt: row.letterGeneratedAt?.toISOString() ?? null,
    letterTemplateId: row.letterTemplateId,
    letterVersions,
    offerTextPreview: row.offerTextPreview,
    offerUrl: row.offerUrl,
    profileId: row.profileId,
    rawOfferText: row.rawOfferText,
    sourceLabel: row.sourceLabel,
    sourceType: row.sourceType,
    status: row.status,
    statusHistory: row.statusHistory,
    updatedAt: row.updatedAt.toISOString(),
    userEmail: row.userEmail,
  };
}

function toRow(application: StoredApplication) {
  return {
    atsScore: application.atsScore ?? null,
    createdAt: new Date(application.createdAt),
    cvContent: application.cvContent ?? null,
    cvGeneratedAt: application.cvGeneratedAt
      ? new Date(application.cvGeneratedAt)
      : null,
    cvTemplateId: application.cvTemplateId ?? null,
    extracted: application.extracted,
    id: application.id,
    interviewReports: application.interviewReports ?? [],
    companyContext: application.companyContext ?? null,
    companyContextGeneratedAt: application.companyContextGeneratedAt
      ? new Date(application.companyContextGeneratedAt)
      : null,
    letterContent: application.letterContent ?? null,
    letterGeneratedAt: application.letterGeneratedAt
      ? new Date(application.letterGeneratedAt)
      : null,
    letterTemplateId: application.letterTemplateId ?? null,
    offerTextPreview: application.offerTextPreview,
    offerUrl: application.offerUrl,
    profileId: application.profileId ?? null,
    rawOfferText: application.rawOfferText,
    sourceLabel: application.sourceLabel,
    sourceType: application.sourceType,
    status: application.status,
    statusHistory: application.statusHistory,
    updatedAt: new Date(application.updatedAt),
    userEmail: application.userEmail,
  };
}

export class PgApplicationsStore implements ApplicationsStore {
  constructor(private readonly db: Database) {}

  createDraft(application: StoredApplication) {
    return this.persist(application);
  }

  save(application: StoredApplication) {
    return this.persist(application);
  }

  async findById(applicationId: string) {
    const [row] = await this.db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId));

    if (!row) {
      return null;
    }

    const [application] = await this.withVersions([row]);

    return application ?? null;
  }

  async findByIdForUserEmail(userEmail: string, applicationId: string) {
    const [row] = await this.db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.userEmail, userEmail),
        ),
      );

    if (!row) {
      return null;
    }

    const [application] = await this.withVersions([row]);

    return application ?? null;
  }

  async listAll() {
    const rows = await this.db
      .select()
      .from(applications)
      .orderBy(desc(applications.updatedAt));

    return this.withVersions(rows);
  }

  async listByUserEmail(userEmail: string) {
    const rows = await this.db
      .select()
      .from(applications)
      .where(eq(applications.userEmail, userEmail))
      .orderBy(desc(applications.createdAt));

    return this.withVersions(rows);
  }

  /** The versions cascade with their application. */
  async deleteByUserEmail(userEmail: string) {
    const deleted = await this.db
      .delete(applications)
      .where(eq(applications.userEmail, userEmail))
      .returning({ id: applications.id });

    return deleted.length;
  }

  /**
   * Writes the application and replaces its version rows. The caller always
   * hands over the full version list, as it did when this was one JSON blob,
   * so the rows are deleted and re-inserted inside the same transaction.
   */
  private persist(application: StoredApplication) {
    const row = toRow(application);

    return this.db.transaction(async (tx) => {
      await tx
        .insert(applications)
        .values(row)
        .onConflictDoUpdate({ target: applications.id, set: row });

      await this.replaceVersions(tx, application);

      return application;
    });
  }

  private async replaceVersions(tx: Tx, application: StoredApplication) {
    await tx
      .delete(applicationCvVersions)
      .where(eq(applicationCvVersions.applicationId, application.id));
    await tx
      .delete(applicationLetterVersions)
      .where(eq(applicationLetterVersions.applicationId, application.id));

    for (const version of application.cvVersions ?? []) {
      await tx.insert(applicationCvVersions).values({
        applicationId: application.id,
        atsEngineVersion: version.atsEngineVersion ?? null,
        atsScore: version.atsScore ?? null,
        content: version.content,
        createdAt: new Date(version.createdAt),
        id: version.id,
        source: version.source,
        templateId: version.templateId,
        versionNumber: version.versionNumber,
      });
    }

    for (const version of application.letterVersions ?? []) {
      await tx.insert(applicationLetterVersions).values({
        applicationId: application.id,
        content: version.content,
        createdAt: new Date(version.createdAt),
        id: version.id,
        source: version.source,
        templateId: version.templateId,
        versionNumber: version.versionNumber,
      });
    }
  }

  /** One query per version table for the whole page, never one per row. */
  private async withVersions(rows: ApplicationRow[]) {
    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map(({ id }) => id);
    const [cvRows, letterRows] = await Promise.all([
      this.db
        .select()
        .from(applicationCvVersions)
        .where(inArray(applicationCvVersions.applicationId, ids))
        .orderBy(asc(applicationCvVersions.versionNumber)),
      this.db
        .select()
        .from(applicationLetterVersions)
        .where(inArray(applicationLetterVersions.applicationId, ids))
        .orderBy(asc(applicationLetterVersions.versionNumber)),
    ]);

    const cvByApplication = new Map<string, CVDocumentVersionEntry[]>();
    const letterByApplication = new Map<string, LetterDocumentVersionEntry[]>();

    for (const row of cvRows) {
      const list = cvByApplication.get(row.applicationId) ?? [];
      list.push(toCvVersion(row));
      cvByApplication.set(row.applicationId, list);
    }

    for (const row of letterRows) {
      const list = letterByApplication.get(row.applicationId) ?? [];
      list.push(toLetterVersion(row));
      letterByApplication.set(row.applicationId, list);
    }

    return rows.map((row) =>
      toApplication(
        row,
        cvByApplication.get(row.id) ?? [],
        letterByApplication.get(row.id) ?? [],
      ),
    );
  }
}
