import {
  APPLICATION_STATUS_DRAFT,
  applicationStatuses,
  type ApplicationStatus,
  type ApplicationStatusHistoryEntry,
  type CVDocumentVersionEntry,
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
