import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  AuthAccount,
  AuthAccountStore,
  AuthConsentRecord,
  AuthInvitation,
  AuthRole,
} from "./auth.types";

type PersistedAuthState = {
  accounts: Record<string, AuthAccount>;
  bootstrapConsumed: boolean;
  invitations: Record<string, AuthInvitation>;
};

function createEmptyState(): PersistedAuthState {
  return {
    accounts: {},
    bootstrapConsumed: false,
    invitations: {},
  };
}

export class FileAuthAccountStore implements AuthAccountStore {
  constructor(private readonly stateFilePath: string) {}

  readAccount(email: string) {
    const state = this.readState();

    return state.accounts[email] ?? null;
  }

  resolveRole(email: string, consent?: AuthConsentRecord | null): AuthRole {
    const state = this.readState();
    const account = state.accounts[email];

    if (account) {
      return account.role;
    }

    const role: AuthRole = state.bootstrapConsumed ? "user" : "admin";

    state.accounts[email] = {
      consent: consent ?? null,
      role,
    };

    if (role === "admin") {
      state.bootstrapConsumed = true;
    }

    this.writeState(state);

    return role;
  }

  assignInvitedRole(email: string, role: AuthRole, consent: AuthConsentRecord): AuthRole {
    const state = this.readState();
    const existingRole = state.accounts[email]?.role;
    const resolvedRole =
      existingRole === "admin" || role === "admin" ? "admin" : "user";

    state.accounts[email] = {
      consent,
      role: resolvedRole,
    };

    if (resolvedRole === "admin") {
      state.bootstrapConsumed = true;
    }

    this.writeState(state);

    return resolvedRole;
  }

  readInvitation(tokenHash: string): AuthInvitation | null {
    const state = this.readState();

    return state.invitations[tokenHash] ?? null;
  }

  saveInvitation(tokenHash: string, invitation: AuthInvitation) {
    const state = this.readState();

    state.invitations[tokenHash] = invitation;

    this.writeState(state);
  }

  consumeInvitation(tokenHash: string, consumedAt: string, now: number) {
    const state = this.readState();
    const invitation = state.invitations[tokenHash];

    if (!invitation) {
      return null;
    }

    if (
      invitation.consumedAt !== null ||
      new Date(invitation.expiresAt).getTime() <= now
    ) {
      return null;
    }

    state.invitations[tokenHash] = {
      ...invitation,
      consumedAt,
    };

    this.writeState(state);

    return state.invitations[tokenHash];
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
        invitations: parsed.invitations ?? {},
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
