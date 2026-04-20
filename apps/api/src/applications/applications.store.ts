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

export class FileApplicationsStore implements ApplicationsStore {
  constructor(private readonly stateFilePath: string) {}

  createDraft(application: StoredApplication) {
    const state = this.readState();

    state.applications[application.id] = application;
    this.writeState(state);

    return application;
  }

  listByUserEmail(userEmail: string) {
    const state = this.readState();

    return Object.values(state.applications)
      .filter((application) => application.userEmail === userEmail)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
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
        applications: parsed.applications ?? {},
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
