import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AuthAccountStore, AuthRole } from "./auth.types";

type PersistedAuthState = {
  accounts: Record<string, { role: AuthRole }>;
  bootstrapConsumed: boolean;
};

function createEmptyState(): PersistedAuthState {
  return {
    accounts: {},
    bootstrapConsumed: false,
  };
}

export class FileAuthAccountStore implements AuthAccountStore {
  constructor(private readonly stateFilePath: string) {}

  resolveRole(email: string): AuthRole {
    const state = this.readState();
    const account = state.accounts[email];

    if (account) {
      return account.role;
    }

    const role: AuthRole = state.bootstrapConsumed ? "user" : "admin";

    state.accounts[email] = { role };

    if (role === "admin") {
      state.bootstrapConsumed = true;
    }

    this.writeState(state);

    return role;
  }

  private readState(): PersistedAuthState {
    if (!existsSync(this.stateFilePath)) {
      return createEmptyState();
    }

    try {
      const parsed = JSON.parse(
        readFileSync(this.stateFilePath, "utf8"),
      ) as Partial<PersistedAuthState>;

      return {
        accounts: parsed.accounts ?? {},
        bootstrapConsumed: parsed.bootstrapConsumed ?? false,
      };
    } catch {
      return createEmptyState();
    }
  }

  private writeState(state: PersistedAuthState) {
    mkdirSync(dirname(this.stateFilePath), { recursive: true });
    writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
  }
}
