import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_SENT,
  SUBMISSION_FIELDS_MAX,
  SUBMISSION_FIELD_TEXT_MAX,
  SUBMISSION_SCREENSHOT_MAX_BYTES,
  SUBMISSION_SCREENSHOT_TYPES,
  type ApplicationSubmission,
  type SubmissionField,
} from "@cvforge/types";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { applicationSubmissions } from "../database/schema";
import type { ApplicationsService } from "./applications.service";

export type NewSubmission = {
  applicationId: string;
  submittedAt: Date;
  formUrl: string;
  confirmationUrl: string | null;
  confirmed: boolean;
  documents: string[];
  fields: SubmissionField[];
  screenshot: Buffer | null;
  screenshotType: string | null;
};

/** DI token for the submissions store. */
export const SUBMISSIONS_STORE = Symbol("SUBMISSIONS_STORE");

export type SubmissionsStore = {
  insert(
    userEmail: string,
    submission: NewSubmission,
  ): Promise<ApplicationSubmission>;
  list(
    userEmail: string,
    applicationId: string,
  ): Promise<ApplicationSubmission[]>;
  listForExport(
    userEmail: string,
  ): Promise<(ApplicationSubmission & { screenshotBase64: string | null })[]>;
  screenshot(
    userEmail: string,
    submissionId: string,
  ): Promise<{ bytes: Buffer; type: string } | null>;
};

type Row = typeof applicationSubmissions.$inferSelect;

const summary = (row: Row): ApplicationSubmission => ({
  applicationId: row.applicationId,
  confirmationUrl: row.confirmationUrl,
  confirmed: row.confirmed,
  documents: row.documents,
  fields: row.fields,
  formUrl: row.formUrl,
  hasScreenshot: row.screenshot !== null,
  id: row.id,
  submittedAt: row.submittedAt.toISOString(),
});

export class PgSubmissionsStore implements SubmissionsStore {
  constructor(private readonly db: Database) {}

  async insert(userEmail: string, submission: NewSubmission) {
    const [row] = await this.db
      .insert(applicationSubmissions)
      .values({ ...submission, userEmail })
      .returning();
    return summary(row!);
  }

  async list(userEmail: string, applicationId: string) {
    const rows = await this.db
      .select()
      .from(applicationSubmissions)
      .where(
        and(
          eq(applicationSubmissions.userEmail, userEmail),
          eq(applicationSubmissions.applicationId, applicationId),
        ),
      )
      .orderBy(desc(applicationSubmissions.submittedAt));
    return rows.map(summary);
  }

  async listForExport(userEmail: string) {
    const rows = await this.db
      .select()
      .from(applicationSubmissions)
      .where(eq(applicationSubmissions.userEmail, userEmail));
    return rows.map((row) => ({
      ...summary(row),
      screenshotBase64: row.screenshot?.toString("base64") ?? null,
    }));
  }

  async screenshot(userEmail: string, submissionId: string) {
    const [row] = await this.db
      .select({
        bytes: applicationSubmissions.screenshot,
        type: applicationSubmissions.screenshotType,
      })
      .from(applicationSubmissions)
      .where(
        and(
          eq(applicationSubmissions.userEmail, userEmail),
          eq(applicationSubmissions.id, submissionId),
        ),
      );
    return row?.bytes && row.type ? { bytes: row.bytes, type: row.type } : null;
  }
}

function webUrl(value: unknown, what: string): string {
  if (typeof value !== "string" || value.length > 2_000) {
    throw new BadRequestException(`${what} invalide.`);
  }
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new BadRequestException(`${what} invalide.`);
  }
  return url.toString();
}

const clip = (value: unknown) =>
  String(value ?? "")
    .trim()
    .slice(0, SUBMISSION_FIELD_TEXT_MAX);

/**
 * Records what the extension sent (US-198). A confirmed sending moves the
 * application to "sent"; an unconfirmed one leaves it a draft, to check.
 */
export class SubmissionsService {
  constructor(
    private readonly store: SubmissionsStore,
    private readonly applications: Pick<
      ApplicationsService,
      "getApplicationForUser" | "updateStatus"
    >,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async record(
    userEmail: string,
    input: {
      applicationId: string;
      formUrl: string;
      confirmationUrl?: string | null;
      confirmed: boolean;
      documents: string[];
      fields: SubmissionField[];
      screenshotBase64?: string | null;
      screenshotType?: string | null;
    },
  ): Promise<ApplicationSubmission> {
    const application = await this.applications.getApplicationForUser(
      userEmail,
      input.applicationId,
    );
    if (application.status !== APPLICATION_STATUS_DRAFT) {
      throw new ConflictException("Cette candidature a déjà été envoyée.");
    }
    if (input.fields.length > SUBMISSION_FIELDS_MAX) {
      throw new BadRequestException("Trop de champs.");
    }
    const screenshot = this.readScreenshot(
      input.screenshotBase64,
      input.screenshotType,
    );

    const submission = await this.store.insert(userEmail, {
      applicationId: application.id,
      confirmationUrl:
        input.confirmed && input.confirmationUrl
          ? webUrl(input.confirmationUrl, "Adresse de confirmation")
          : null,
      confirmed: input.confirmed,
      documents: input.documents.slice(0, 5).map(clip),
      fields: input.fields.map((field) => ({
        label: clip(field.label),
        value: clip(field.value),
      })),
      formUrl: webUrl(input.formUrl, "Adresse du formulaire"),
      screenshot: screenshot?.bytes ?? null,
      screenshotType: screenshot?.type ?? null,
      submittedAt: this.now(),
    });

    if (input.confirmed) {
      await this.applications.updateStatus(
        userEmail,
        application.id,
        APPLICATION_STATUS_SENT,
      );
    }
    return submission;
  }

  list(userEmail: string, applicationId: string) {
    return this.store.list(userEmail, applicationId);
  }

  async screenshot(userEmail: string, submissionId: string) {
    const shot = await this.store.screenshot(userEmail, submissionId);
    if (!shot) throw new NotFoundException("Capture introuvable.");
    return shot;
  }

  private readScreenshot(base64?: string | null, type?: string | null) {
    if (!base64) return null;
    if (
      !(SUBMISSION_SCREENSHOT_TYPES as readonly string[]).includes(type ?? "")
    ) {
      throw new BadRequestException("Format de capture non accepté.");
    }
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length === 0 || bytes.length > SUBMISSION_SCREENSHOT_MAX_BYTES) {
      throw new BadRequestException("Capture trop lourde.");
    }
    return { bytes, type: type as string };
  }
}
