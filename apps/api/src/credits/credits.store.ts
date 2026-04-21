import type { CreditLedgerEntry } from "@cvforge/types";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CreditLedgerStore } from "./credits.types";

type PersistedCreditsState = {
  entries: CreditLedgerEntry[];
};

function createEmptyState(): PersistedCreditsState {
  return {
    entries: [],
  };
}

function normalizeEntry(entry: CreditLedgerEntry): CreditLedgerEntry {
  return {
    ...entry,
    metadata: entry.metadata ?? {},
    note: entry.note ?? null,
  };
}

export class FileCreditLedgerStore implements CreditLedgerStore {
  constructor(private readonly stateFilePath: string) {}

  addEntry(entry: CreditLedgerEntry) {
    const state = this.readState();
    const normalized = normalizeEntry(entry);
    state.entries.push(normalized);
    this.writeState(state);
    return normalized;
  }

  listEntriesForUser(userEmail: string) {
    const state = this.readState();

    return state.entries
      .filter((entry) => entry.userEmail === userEmail)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  private readState(): PersistedCreditsState {
    if (!existsSync(this.stateFilePath)) {
      return createEmptyState();
    }

    try {
      const parsed = JSON.parse(
        readFileSync(this.stateFilePath, "utf8"),
      ) as Partial<PersistedCreditsState>;

      return {
        entries: Array.isArray(parsed.entries)
          ? parsed.entries.map((entry) => normalizeEntry(entry))
          : [],
      };
    } catch {
      return createEmptyState();
    }
  }

  private writeState(state: PersistedCreditsState) {
    mkdirSync(dirname(this.stateFilePath), { recursive: true });
    writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
  }
}
