import type {
  AuthAccount,
  AuthAccountStore,
  AuthInvitation,
  AuthRole,
} from "../auth.types";

/**
 * Memory-backed `AuthAccountStore` mirroring `FileAuthAccountStore`, minus the
 * disk. Shared by the auth service and controller suites so both exercise the
 * same semantics — first account becomes admin, invitations expire once.
 */
export function createInMemoryAccountStore(): AuthAccountStore {
  const accounts = new Map<string, AuthAccount>();
  const invitations = new Map<string, AuthInvitation>();
  let bootstrapConsumed = false;

  return {
    listAccounts() {
      return [...accounts.entries()]
        .map(([email, account]) => ({
          email,
          ...account,
        }))
        .sort((left, right) => left.email.localeCompare(right.email));
    },
    updateRole(email, role) {
      const account = accounts.get(email);

      if (!account) {
        return null;
      }

      accounts.set(email, { ...account, role });

      return { email, ...account, role };
    },
    readAccount(email) {
      return accounts.get(email) ?? null;
    },
    resolveRole(email, consent) {
      const existingRole = accounts.get(email)?.role;

      if (existingRole) {
        return existingRole;
      }

      const role: AuthRole = bootstrapConsumed ? "user" : "admin";

      accounts.set(email, { consent: consent ?? null, role });

      if (role === "admin") {
        bootstrapConsumed = true;
      }

      return role;
    },
    assignInvitedRole(email, role, consent) {
      const existingRole = accounts.get(email)?.role;
      const resolvedRole =
        existingRole === "admin" || role === "admin" ? "admin" : "user";

      accounts.set(email, { consent, role: resolvedRole });

      if (resolvedRole === "admin") {
        bootstrapConsumed = true;
      }

      return resolvedRole;
    },
    readInvitation(tokenHash) {
      return invitations.get(tokenHash) ?? null;
    },
    saveInvitation(tokenHash, invitation) {
      invitations.set(tokenHash, invitation);
    },
    consumeInvitation(tokenHash, consumedAt, now) {
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
    exportUserData(email) {
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
    purgeUserData(email) {
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
