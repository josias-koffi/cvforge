import {
  APPLICATION_STATUS_DRAFT,
  applicationStatuses,
  type ApplicationStatus,
  type ApplicationStatusHistoryEntry,
  type CVDocumentVersionEntry,
  type InterviewReport,
  type LetterDocumentVersionEntry,
} from "@cvforge/types";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  ApplicationsStore,
  StoredApplication,
} from "./applications.types";

type PersistedApplicationsState = {
  applications: Record<string, StoredApplication>;
};

function createEmptyState(): PersistedApplicationsState {
  return {
    applications: {},
  };
}

function normalizeStatus(status: unknown): ApplicationStatus {
  return applicationStatuses.includes(status as ApplicationStatus)
    ? (status as ApplicationStatus)
    : APPLICATION_STATUS_DRAFT;
}

function normalizeStatusHistory(
  value: unknown,
  fallbackStatus: ApplicationStatus,
  fallbackChangedAt: string,
): ApplicationStatusHistoryEntry[] {
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const changedAt =
          typeof (entry as { changedAt?: unknown }).changedAt === "string"
            ? (entry as { changedAt: string }).changedAt
            : fallbackChangedAt;
        const status = normalizeStatus((entry as { status?: unknown }).status);

        return { changedAt, status };
      })
      .filter((entry): entry is ApplicationStatusHistoryEntry => entry !== null);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [{ changedAt: fallbackChangedAt, status: fallbackStatus }];
}

function normalizeStoredApplication(
  application: StoredApplication,
): StoredApplication {
  const status = normalizeStatus(application.status);
  const fallbackChangedAt = application.updatedAt || application.createdAt;
  const cvVersions = normalizeCvVersions(application);
  const letterVersions = normalizeLetterVersions(application);

  return {
    ...application,
    cvContent: application.cvContent ?? null,
    cvGeneratedAt: application.cvGeneratedAt ?? null,
    cvTemplateId: application.cvTemplateId ?? null,
    interviewReports: normalizeInterviewReports(application.interviewReports),
    letterContent: application.letterContent ?? null,
    letterGeneratedAt: application.letterGeneratedAt ?? null,
    letterTemplateId: application.letterTemplateId ?? null,
    cvVersions,
    letterVersions,
    status,
    statusHistory: normalizeStatusHistory(
      application.statusHistory,
      status,
      fallbackChangedAt,
    ),
  };
}

function normalizeInterviewReports(value: unknown): InterviewReport[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const report = entry as Record<string, unknown>;
      const transcriptStats =
        report.transcriptStats && typeof report.transcriptStats === "object"
          ? (report.transcriptStats as Record<string, unknown>)
          : {};

      const metrics = Array.isArray(report.metrics)
        ? report.metrics
            .map((metric) => {
              if (!metric || typeof metric !== "object") {
                return null;
              }

              const record = metric as Record<string, unknown>;
              const score = typeof record.score === "number" ? record.score : 0;

              return {
                detail:
                  typeof record.detail === "string" ? record.detail : "",
                key:
                  record.key === "clarity" ||
                  record.key === "keywords" ||
                  record.key === "pacing" ||
                  record.key === "hesitations" ||
                  record.key === "relevance"
                    ? record.key
                    : "clarity",
                label:
                  typeof record.label === "string" ? record.label : "",
                score: Math.max(0, Math.min(10, Math.round(score))),
              };
            })
            .filter((metric): metric is InterviewReport["metrics"][number] => metric !== null)
        : [];

      return {
        createdAt:
          typeof report.createdAt === "string"
            ? report.createdAt
            : new Date(0).toISOString(),
        improvements: Array.isArray(report.improvements)
          ? report.improvements
              .map((item) => (typeof item === "string" ? item.trim() : ""))
              .filter((item) => item.length > 0)
          : [],
        metrics,
        overallScore:
          typeof report.overallScore === "number"
            ? Math.max(0, Math.min(10, Math.round(report.overallScore)))
            : 0,
        summary: typeof report.summary === "string" ? report.summary : "",
        transcriptStats: {
          averageResponseDurationSeconds:
            typeof transcriptStats.averageResponseDurationSeconds === "number"
              ? transcriptStats.averageResponseDurationSeconds
              : null,
          hesitationCount:
            typeof transcriptStats.hesitationCount === "number"
              ? Math.max(0, Math.round(transcriptStats.hesitationCount))
              : 0,
          keywordCoverage:
            typeof transcriptStats.keywordCoverage === "number"
              ? Math.max(0, Math.min(100, Math.round(transcriptStats.keywordCoverage)))
              : 0,
          keywordMentions: Array.isArray(transcriptStats.keywordMentions)
            ? transcriptStats.keywordMentions
                .map((item) => (typeof item === "string" ? item.trim() : ""))
                .filter((item) => item.length > 0)
            : [],
          responseCount:
            typeof transcriptStats.responseCount === "number"
              ? Math.max(0, Math.round(transcriptStats.responseCount))
              : 0,
        },
      };
    })
    .filter((report): report is InterviewReport => report !== null);
}

function normalizeCvVersions(
  application: StoredApplication,
): CVDocumentVersionEntry[] {
  if (Array.isArray(application.cvVersions) && application.cvVersions.length > 0) {
    return application.cvVersions;
  }

  if (!application.cvContent) {
    return [];
  }

  const createdAt =
    application.cvGeneratedAt ?? application.updatedAt ?? application.createdAt;

  return [
    {
      content: application.cvContent,
      createdAt,
      id: `${application.id}-cv-v1`,
      source: "generation",
      templateId: application.cvTemplateId ?? null,
      versionNumber: 1,
    },
  ];
}

function normalizeLetterVersions(
  application: StoredApplication,
): LetterDocumentVersionEntry[] {
  if (
    Array.isArray(application.letterVersions) &&
    application.letterVersions.length > 0
  ) {
    return application.letterVersions;
  }

  if (!application.letterContent) {
    return [];
  }

  const createdAt =
    application.letterGeneratedAt ?? application.updatedAt ?? application.createdAt;

  return [
    {
      content: application.letterContent,
      createdAt,
      id: `${application.id}-letter-v1`,
      source: "generation",
      templateId: application.letterTemplateId ?? null,
      versionNumber: 1,
    },
  ];
}

export class FileApplicationsStore implements ApplicationsStore {
  constructor(private readonly stateFilePath: string) {}

  createDraft(application: StoredApplication) {
    const state = this.readState();

    state.applications[application.id] = normalizeStoredApplication(application);
    this.writeState(state);

    return application;
  }

  findById(applicationId: string) {
    const state = this.readState();
    return state.applications[applicationId] ?? null;
  }

  findByIdForUserEmail(userEmail: string, applicationId: string) {
    const state = this.readState();
    const application = state.applications[applicationId];

    if (!application || application.userEmail !== userEmail) {
      return null;
    }

    return application;
  }

  listAll() {
    const state = this.readState();

    return Object.values(state.applications)
      .map(normalizeStoredApplication)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  listByUserEmail(userEmail: string) {
    const state = this.readState();

    return Object.values(state.applications)
      .filter((application) => application.userEmail === userEmail)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  save(application: StoredApplication) {
    const state = this.readState();

    state.applications[application.id] = normalizeStoredApplication(application);
    this.writeState(state);

    return application;
  }

  deleteByUserEmail(userEmail: string) {
    const state = this.readState();
    let removedCount = 0;

    for (const [applicationId, application] of Object.entries(state.applications)) {
      if (application.userEmail !== userEmail) {
        continue;
      }

      delete state.applications[applicationId];
      removedCount += 1;
    }

    this.writeState(state);

    return removedCount;
  }

  private readState(): PersistedApplicationsState {
    if (!existsSync(this.stateFilePath)) {
      return createEmptyState();
    }

    try {
      const parsed = JSON.parse(
        readFileSync(this.stateFilePath, "utf8"),
      ) as Partial<PersistedApplicationsState>;

      return {
        applications: Object.fromEntries(
          Object.entries(parsed.applications ?? {}).map(([id, application]) => [
            id,
            normalizeStoredApplication(application as StoredApplication),
          ]),
        ),
      };
    } catch {
      return createEmptyState();
    }
  }

  private writeState(state: PersistedApplicationsState) {
    mkdirSync(dirname(this.stateFilePath), { recursive: true });
    writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
  }
}
