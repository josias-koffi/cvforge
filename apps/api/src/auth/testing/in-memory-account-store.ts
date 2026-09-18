import { ACCOUNT_STATUS_ACTIVE } from "@cvforge/types";
import type {
  AuthAccount,
  AuthAccountStore,
  AuthInvitation,
  AuthRole,
} from "../auth.types";

/**
 * Memory-backed `AuthAccountStore` shared by the auth service and controller
 * suites, which drive the clock with fake timers — PGlite's own async work
 * does not survive that. `auth.pg-store.test.ts` covers the real store's
 * semantics against Postgres instead.
 */
export function createInMemoryAccountStore(): AuthAccountStore {
  const accounts = new Map<string, AuthAccount>();
  const invitations = new Map<string, AuthInvitation>();
  let bootstrapConsumed = false;

  return {
    async listAccounts() {
      return [...accounts.entries()]
        .map(([email, account]) => ({
          email,
          ...account,
        }))
        .sort((left, right) => left.email.localeCompare(right.email));
    },
    async readAccountState(email) {
      const account = accounts.get(email);

      return account
        ? {
            sessionsValidFrom: account.sessionsValidFrom,
            status: account.status,
          }
        : null;
    },
    async setAccountStatus(email, status, sessionsValidFrom) {
      const account = accounts.get(email);

      if (!account) {
        return null;
      }

      const updated = {
        ...account,
        sessionsValidFrom: sessionsValidFrom ?? account.sessionsValidFrom,
        status,
      };

      accounts.set(email, updated);

      return { email, ...updated };
    },
    async revokeSessions(email, sessionsValidFrom) {
      const account = accounts.get(email);

      if (!account) {
        return null;
      }

      const updated = { ...account, sessionsValidFrom };

      accounts.set(email, updated);

      return { email, ...updated };
    },
    async demoteToUser(email) {
      const account = accounts.get(email);

      if (!account) {
        return null;
      }

      const demoted = { ...account, role: "user" as const };

      accounts.set(email, demoted);

      return { email, ...demoted };
    },
    async readAccount(email) {
      return accounts.get(email) ?? null;
    },
    async resolveRole(email, consent) {
      const existingRole = accounts.get(email)?.role;

      if (existingRole) {
        return existingRole;
      }

      const role: AuthRole = bootstrapConsumed ? "user" : "admin";

      accounts.set(email, {
        consent: consent ?? null,
        role,
        sessionsValidFrom: null,
        status: ACCOUNT_STATUS_ACTIVE,
      });

      if (role === "admin") {
        bootstrapConsumed = true;
      }

      return role;
    },
    async assignInvitedRole(email, role, consent) {
      const existingRole = accounts.get(email)?.role;
      const resolvedRole =
        existingRole === "admin" || role === "admin" ? "admin" : "user";

      accounts.set(email, {
        consent,
        role: resolvedRole,
        sessionsValidFrom: accounts.get(email)?.sessionsValidFrom ?? null,
        status: accounts.get(email)?.status ?? ACCOUNT_STATUS_ACTIVE,
      });

      if (resolvedRole === "admin") {
        bootstrapConsumed = true;
      }

      return resolvedRole;
    },
    async readInvitation(tokenHash) {
      return invitations.get(tokenHash) ?? null;
    },
    async saveInvitation(tokenHash, invitation) {
      invitations.set(tokenHash, invitation);
    },
    async consumeInvitation(tokenHash, consumedAt, now) {
      const invitation = invitations.get(tokenHash);

      if (!invitation) {
        return null;
      }

      if (
        invitation.consumedAt !== null ||
        new Date(invitation.expiresAt).getTime() <= now
      ) {
        return null;
      }

      const updatedInvitation = {
        ...invitation,
        consumedAt,
      };

      invitations.set(tokenHash, updatedInvitation);

      return updatedInvitation;
    },
    async exportUserData(email) {
      const account = accounts.get(email);
      const withTokenHash = ([tokenHash, invitation]: [
        string,
        AuthInvitation,
      ]) => ({ tokenHash, ...invitation });

      return {
        account: account ? { email, ...account } : null,
        issuedInvitations: [...invitations.entries()]
          .filter(([, invitation]) => invitation.createdBy === email)
          .map(withTokenHash),
        receivedInvitations: [...invitations.entries()]
          .filter(([, invitation]) => invitation.email === email)
          .map(withTokenHash),
      };
    },
    async purgeUserData(email) {
      const accountDeleted = accounts.delete(email);
      const received = [...invitations.entries()].filter(
        ([, invitation]) => invitation.email === email,
      );

      received.forEach(([tokenHash]) => invitations.delete(tokenHash));

      // Losing the last admin re-opens the bootstrap, as on disk.
      if (![...accounts.values()].some(({ role }) => role === "admin")) {
        bootstrapConsumed = false;
      }

      return {
        accountDeleted,
        invitationsRemoved: received.length,
        invitationsScrubbed: 0,
      };
    },
  };
}
