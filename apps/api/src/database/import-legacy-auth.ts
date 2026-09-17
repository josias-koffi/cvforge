import { existsSync, readFileSync } from "node:fs";
import type {
  AuthAccount,
  AuthInvitation,
  AuthRole,
} from "../auth/auth.types";
import type { Database } from "./database.types";
import { authAccounts, authInvitations, authSettings, dataImports } from "./schema";

export const LEGACY_AUTH_IMPORT = "auth-state.json";

export type LegacyAuthImportResult =
  | { status: "already_imported" }
  | {
      status: "imported";
      accounts: number;
      invitations: number;
      bootstrapConsumed: boolean;
    };

type LegacyState = {
  accounts: Record<string, AuthAccount>;
  bootstrapConsumed: boolean;
  invitations: Record<string, AuthInvitation>;
};

function readLegacyState(filePath: string): LegacyState {
  if (!existsSync(filePath)) {
    return { accounts: {}, bootstrapConsumed: false, invitations: {} };
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as
    Partial<LegacyState>;

  return {
    accounts: parsed.accounts ?? {},
    bootstrapConsumed: parsed.bootstrapConsumed ?? false,
    invitations: parsed.invitations ?? {},
  };
}

function normalizeRole(value: unknown): AuthRole {
  return value === "admin" ? "admin" : "user";
}

/**
 * Copies accounts, invitations and the bootstrap latch into Postgres once per
 * environment.
 *
 * The latch is carried over rather than recomputed. A file that says the
 * bootstrap is spent while holding no admin — the state left by purging the
 * last admin — must stay that way, or the next person to sign in would be
 * handed admin on an environment that never meant to offer it.
 *
 * A missing file is recorded as imported too: there is nothing left to copy.
 */
export async function importLegacyAuth(
  db: Database,
  filePath: string,
): Promise<LegacyAuthImportResult> {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .insert(dataImports)
      .values({ name: LEGACY_AUTH_IMPORT })
      .onConflictDoNothing()
      .returning({ name: dataImports.name });

    if (claimed.length === 0) {
      return { status: "already_imported" };
    }

    const state = readLegacyState(filePath);
    const accounts = Object.entries(state.accounts);

    for (const [email, account] of accounts) {
      await tx
        .insert(authAccounts)
        .values({
          consent: account?.consent ?? null,
          email,
          role: normalizeRole(account?.role),
        })
        .onConflictDoNothing();
    }

    const invitations = Object.entries(state.invitations);

    for (const [tokenHash, invitation] of invitations) {
      await tx
        .insert(authInvitations)
        .values({
          consumedAt: invitation.consumedAt
            ? new Date(invitation.consumedAt)
            : null,
          createdAt: new Date(invitation.createdAt),
          createdBy: invitation.createdBy,
          email: invitation.email,
          expiresAt: new Date(invitation.expiresAt),
          role: normalizeRole(invitation.role),
          tokenHash,
        })
        .onConflictDoNothing();
    }

    const bootstrapConsumed =
      state.bootstrapConsumed ||
      accounts.some(([, account]) => normalizeRole(account?.role) === "admin");

    await tx
      .insert(authSettings)
      .values({ bootstrapConsumed, id: "singleton" })
      .onConflictDoUpdate({
        target: authSettings.id,
        set: { bootstrapConsumed },
      });

    return {
      status: "imported",
      accounts: accounts.length,
      invitations: invitations.length,
      bootstrapConsumed,
    };
  });
}
