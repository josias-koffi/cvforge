import { asc, eq, lte, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  authAccounts,
  authInvitations,
  authMagicLinks,
  authSettings,
} from "../database/schema";
import type { AccountStatus } from "@cvforge/types";
import type {
  AuthAccountStore,
  AuthConsentRecord,
  AuthInvitation,
  AuthMagicLink,
  AuthRole,
} from "./auth.types";

export const DELETED_ACCOUNT_MARKER = "[deleted-account]";

const SETTINGS_ID = "singleton";

type AccountRow = typeof authAccounts.$inferSelect;
type InvitationRow = typeof authInvitations.$inferSelect;
type MagicLinkRow = typeof authMagicLinks.$inferSelect;

function toMagicLink(row: MagicLinkRow): AuthMagicLink {
  return {
    consent: row.consent ?? null,
    email: row.email,
    expiresAt: row.expiresAt.toISOString(),
  };
}

function toInvitation(row: InvitationRow): AuthInvitation {
  return {
    consumedAt: row.consumedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    email: row.email,
    expiresAt: row.expiresAt.toISOString(),
    role: row.role,
  };
}

function toAccount(row: AccountRow) {
  return {
    consent: row.consent ?? null,
    role: row.role,
    sessionsValidFrom: row.sessionsValidFrom?.toISOString() ?? null,
    status: row.status,
  };
}

export class PgAuthAccountStore implements AuthAccountStore {
  constructor(private readonly db: Database) {}

  async listAccounts() {
    const rows = await this.db
      .select()
      .from(authAccounts)
      .orderBy(asc(authAccounts.email));

    return rows.map((row) => ({ email: row.email, ...toAccount(row) }));
  }

  async readAccount(email: string) {
    const [row] = await this.db
      .select()
      .from(authAccounts)
      .where(eq(authAccounts.email, email));

    return row ? toAccount(row) : null;
  }

  async readAccountState(email: string) {
    const [row] = await this.db
      .select({
        sessionsValidFrom: authAccounts.sessionsValidFrom,
        status: authAccounts.status,
      })
      .from(authAccounts)
      .where(eq(authAccounts.email, email));

    return row
      ? {
          sessionsValidFrom: row.sessionsValidFrom?.toISOString() ?? null,
          status: row.status,
        }
      : null;
  }

  async setAccountStatus(
    email: string,
    status: AccountStatus,
    sessionsValidFrom: string | null,
  ) {
    const [row] = await this.db
      .update(authAccounts)
      .set({
        status,
        // Suspending revokes what is already out there; reactivating leaves
        // the revocation in place, so old cookies stay dead.
        ...(sessionsValidFrom
          ? { sessionsValidFrom: new Date(sessionsValidFrom) }
          : {}),
      })
      .where(eq(authAccounts.email, email))
      .returning();

    return row ? { email: row.email, ...toAccount(row) } : null;
  }

  async revokeSessions(email: string, sessionsValidFrom: string) {
    const [row] = await this.db
      .update(authAccounts)
      .set({ sessionsValidFrom: new Date(sessionsValidFrom) })
      .where(eq(authAccounts.email, email))
      .returning();

    return row ? { email: row.email, ...toAccount(row) } : null;
  }

  async demoteToUser(email: string) {
    const [row] = await this.db
      .update(authAccounts)
      .set({ role: "user" })
      .where(eq(authAccounts.email, email))
      .returning();

    return row ? { email: row.email, ...toAccount(row) } : null;
  }

  /**
   * Reads the role, creating the account on first sight — the file store wrote
   * during this read too. The whole thing is one transaction so two concurrent
   * first sign-ins cannot both be handed admin.
   */
  resolveRole(email: string, consent?: AuthConsentRecord | null) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(authAccounts)
        .where(eq(authAccounts.email, email))
        .for("update");

      if (existing) {
        return existing.role;
      }

      const [settings] = await tx
        .select()
        .from(authSettings)
        .where(eq(authSettings.id, SETTINGS_ID))
        .for("update");

      const role: AuthRole = settings?.bootstrapConsumed ? "user" : "admin";

      await tx
        .insert(authAccounts)
        .values({ consent: consent ?? null, email, role });

      if (role === "admin") {
        await this.consumeBootstrap(tx);
      }

      return role;
    });
  }

  assignInvitedRole(email: string, role: AuthRole, consent: AuthConsentRecord) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(authAccounts)
        .where(eq(authAccounts.email, email))
        .for("update");

      const resolvedRole: AuthRole =
        existing?.role === "admin" || role === "admin" ? "admin" : "user";
      const values = { consent, email, role: resolvedRole };

      await tx
        .insert(authAccounts)
        .values(values)
        .onConflictDoUpdate({
          target: authAccounts.email,
          set: { consent, role: resolvedRole },
        });

      if (resolvedRole === "admin") {
        await this.consumeBootstrap(tx);
      }

      return resolvedRole;
    });
  }

  async readInvitation(tokenHash: string) {
    const [row] = await this.db
      .select()
      .from(authInvitations)
      .where(eq(authInvitations.tokenHash, tokenHash));

    return row ? toInvitation(row) : null;
  }

  async saveInvitation(tokenHash: string, invitation: AuthInvitation) {
    const values = {
      consumedAt: invitation.consumedAt ? new Date(invitation.consumedAt) : null,
      createdAt: new Date(invitation.createdAt),
      createdBy: invitation.createdBy,
      email: invitation.email,
      expiresAt: new Date(invitation.expiresAt),
      role: invitation.role,
      tokenHash,
    };

    await this.db
      .insert(authInvitations)
      .values(values)
      .onConflictDoUpdate({ target: authInvitations.tokenHash, set: values });
  }

  /**
   * Single-use: the update only matches an invitation that is still unconsumed
   * and unexpired, so two redemptions of one link cannot both succeed.
   */
  async consumeInvitation(tokenHash: string, consumedAt: string, now: number) {
    const [row] = await this.db
      .update(authInvitations)
      .set({ consumedAt: new Date(consumedAt) })
      .where(
        sql`${authInvitations.tokenHash} = ${tokenHash}
          and ${authInvitations.consumedAt} is null
          and ${authInvitations.expiresAt} > ${new Date(now)}`,
      )
      .returning();

    return row ? toInvitation(row) : null;
  }

  async saveMagicLink(tokenHash: string, link: AuthMagicLink) {
    const values = {
      consent: link.consent,
      email: link.email,
      expiresAt: new Date(link.expiresAt),
      tokenHash,
    };

    await this.db
      .insert(authMagicLinks)
      .values(values)
      .onConflictDoUpdate({ target: authMagicLinks.tokenHash, set: values });
  }

  /**
   * Single-use without a transaction: the delete matches at most one row, and
   * only the caller whose delete actually removed it gets the link back, so
   * two simultaneous clicks cannot both open a session. An expired row is left
   * for `purgeExpiredMagicLinks` rather than handed back.
   */
  async consumeMagicLink(tokenHash: string, now: number) {
    const [row] = await this.db
      .delete(authMagicLinks)
      .where(
        sql`${authMagicLinks.tokenHash} = ${tokenHash}
          and ${authMagicLinks.expiresAt} > ${new Date(now)}`,
      )
      .returning();

    return row ? toMagicLink(row) : null;
  }

  async purgeExpiredMagicLinks(now: number) {
    const removed = await this.db
      .delete(authMagicLinks)
      .where(lte(authMagicLinks.expiresAt, new Date(now)))
      .returning({ tokenHash: authMagicLinks.tokenHash });

    return removed.length;
  }

  async exportUserData(email: string) {
    const account = await this.readAccount(email);
    const rows = await this.db.select().from(authInvitations);
    const invitations = rows.map((row) => ({
      tokenHash: row.tokenHash,
      ...toInvitation(row),
    }));

    return {
      account: account ? { email, ...account } : null,
      issuedInvitations: invitations.filter(
        (invitation) => invitation.createdBy === email,
      ),
      receivedInvitations: invitations.filter(
        (invitation) => invitation.email === email,
      ),
    };
  }

  /**
   * Account purge. Invitations addressed to the account go; invitations it
   * issued to other people stay, with the issuer scrubbed — they are still
   * other people's access. Pending magic links go too: they are addressed to
   * the account and carry its address. Purging the last admin clears the
   * bootstrap latch, which is the documented way back in.
   */
  purgeUserData(email: string) {
    return this.db.transaction(async (tx) => {
      const [deletedAccount] = await tx
        .delete(authAccounts)
        .where(eq(authAccounts.email, email))
        .returning({ role: authAccounts.role });

      const removed = await tx
        .delete(authInvitations)
        .where(eq(authInvitations.email, email))
        .returning({ tokenHash: authInvitations.tokenHash });

      const scrubbed = await tx
        .update(authInvitations)
        .set({ createdBy: DELETED_ACCOUNT_MARKER })
        .where(eq(authInvitations.createdBy, email))
        .returning({ tokenHash: authInvitations.tokenHash });

      const removedLinks = await tx
        .delete(authMagicLinks)
        .where(eq(authMagicLinks.email, email))
        .returning({ tokenHash: authMagicLinks.tokenHash });

      if (deletedAccount?.role === "admin") {
        const [remainingAdmin] = await tx
          .select({ email: authAccounts.email })
          .from(authAccounts)
          .where(eq(authAccounts.role, "admin"))
          .limit(1);

        if (!remainingAdmin) {
          await tx
            .insert(authSettings)
            .values({ bootstrapConsumed: false, id: SETTINGS_ID })
            .onConflictDoUpdate({
              target: authSettings.id,
              set: { bootstrapConsumed: false },
            });
        }
      }

      return {
        accountDeleted: Boolean(deletedAccount),
        invitationsRemoved: removed.length,
        invitationsScrubbed: scrubbed.length,
        magicLinksRemoved: removedLinks.length,
      };
    });
  }

  private async consumeBootstrap(tx: Parameters<
    Parameters<Database["transaction"]>[0]
  >[0]) {
    await tx
      .insert(authSettings)
      .values({ bootstrapConsumed: true, id: SETTINGS_ID })
      .onConflictDoUpdate({
        target: authSettings.id,
        set: { bootstrapConsumed: true },
      });
  }
}
