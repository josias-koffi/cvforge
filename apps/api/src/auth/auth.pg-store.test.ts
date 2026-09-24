import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { DELETED_ACCOUNT_MARKER, PgAuthAccountStore } from "./auth.pg-store";
import type {
  AuthConsentRecord,
  AuthInvitation,
  AuthMagicLink,
} from "./auth.types";

let testDatabase: TestDatabase;
let store: PgAuthAccountStore;

const consent: AuthConsentRecord = {
  acceptedAt: "2026-04-23T08:10:10.000Z",
  source: "passwordless",
  version: "2026-04-mvp",
};

function makeInvitation(
  overrides: Partial<AuthInvitation> = {},
): AuthInvitation {
  return {
    consumedAt: null,
    createdAt: "2026-04-23T08:00:00.000Z",
    createdBy: "admin@example.com",
    email: "invitee@example.com",
    expiresAt: "2099-01-01T00:00:00.000Z",
    role: "user",
    ...overrides,
  };
}

/** A fixed "now", after the fixtures' creation dates and before 2099. */
const NOW = Date.parse("2026-04-23T09:00:00.000Z");

function makeMagicLink(overrides: Partial<AuthMagicLink> = {}): AuthMagicLink {
  return {
    consent,
    email: "candidate@example.com",
    expiresAt: "2099-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("PgAuthAccountStore", () => {
  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgAuthAccountStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("makes the first account admin and every later one a user", async () => {
    await expect(store.resolveRole("first@example.com", consent)).resolves.toBe(
      "admin",
    );
    await expect(store.resolveRole("second@example.com", consent)).resolves.toBe(
      "user",
    );
  });

  it("returns the existing role rather than re-deciding it", async () => {
    await store.resolveRole("first@example.com", consent);

    await expect(store.resolveRole("first@example.com")).resolves.toBe("admin");
    await expect(store.readAccount("first@example.com")).resolves.toEqual({
      consent,
      role: "admin",
      sessionsValidFrom: null,
      status: "active",
    });
  });

  it("keeps the bootstrap spent once an admin exists", async () => {
    await store.resolveRole("first@example.com", consent);
    await store.purgeUserData("first@example.com");

    // The last admin is gone, so the bootstrap re-opens on purpose.
    await expect(store.resolveRole("next@example.com", consent)).resolves.toBe(
      "admin",
    );
  });

  it("does not re-open the bootstrap when a non-admin is purged", async () => {
    await store.resolveRole("admin@example.com", consent);
    await store.resolveRole("user@example.com", consent);

    await store.purgeUserData("user@example.com");

    await expect(store.resolveRole("next@example.com", consent)).resolves.toBe(
      "user",
    );
  });

  it("lists accounts by email", async () => {
    await store.resolveRole("zoe@example.com", consent);
    await store.resolveRole("alice@example.com", consent);

    const emails = (await store.listAccounts()).map(({ email }) => email);

    expect(emails).toEqual(["alice@example.com", "zoe@example.com"]);
  });

  it("returns null when demoting an unknown account", async () => {
    await expect(store.demoteToUser("ghost@example.com")).resolves.toBeNull();
  });

  it("promotes an invited account and never demotes an admin", async () => {
    await store.resolveRole("admin@example.com", consent);

    await expect(
      store.assignInvitedRole("admin@example.com", "user", consent),
    ).resolves.toBe("admin");
    await expect(
      store.assignInvitedRole("invitee@example.com", "admin", consent),
    ).resolves.toBe("admin");
  });

  it("round-trips an invitation", async () => {
    await store.saveInvitation("hash-1", makeInvitation());

    await expect(store.readInvitation("hash-1")).resolves.toEqual(
      makeInvitation(),
    );
    await expect(store.readInvitation("missing")).resolves.toBeNull();
  });

  it("consumes an invitation exactly once", async () => {
    await store.saveInvitation("hash-1", makeInvitation());
    const now = Date.parse("2026-04-23T09:00:00.000Z");

    const first = await store.consumeInvitation(
      "hash-1",
      "2026-04-23T09:00:00.000Z",
      now,
    );
    const second = await store.consumeInvitation(
      "hash-1",
      "2026-04-23T09:05:00.000Z",
      now,
    );

    expect(first?.consumedAt).toBe("2026-04-23T09:00:00.000Z");
    expect(second).toBeNull();
  });

  it("refuses an expired invitation", async () => {
    await store.saveInvitation(
      "hash-1",
      makeInvitation({ expiresAt: "2026-04-23T08:00:00.000Z" }),
    );

    await expect(
      store.consumeInvitation(
        "hash-1",
        "2026-04-23T09:00:00.000Z",
        Date.parse("2026-04-23T09:00:00.000Z"),
      ),
    ).resolves.toBeNull();
  });

  it("exports the account with the invitations it sent and received", async () => {
    await store.resolveRole("admin@example.com", consent);
    await store.saveInvitation("hash-issued", makeInvitation());
    await store.saveInvitation(
      "hash-received",
      makeInvitation({ createdBy: "other@example.com", email: "admin@example.com" }),
    );

    const snapshot = await store.exportUserData("admin@example.com");

    expect(snapshot.account?.email).toBe("admin@example.com");
    expect(snapshot.issuedInvitations).toHaveLength(1);
    expect(snapshot.receivedInvitations).toHaveLength(1);
  });

  it("purges the account, drops its invitations and scrubs the ones it issued", async () => {
    await store.resolveRole("admin@example.com", consent);
    await store.resolveRole("keeper@example.com", consent);
    await store.saveInvitation("hash-issued", makeInvitation());
    await store.saveInvitation(
      "hash-received",
      makeInvitation({ createdBy: "keeper@example.com", email: "admin@example.com" }),
    );
    await store.saveMagicLink("hash-link", makeMagicLink({ email: "admin@example.com" }));
    await store.saveMagicLink("hash-other-link", makeMagicLink({ email: "keeper@example.com" }));

    await expect(store.purgeUserData("admin@example.com")).resolves.toEqual({
      accountDeleted: true,
      invitationsRemoved: 1,
      invitationsScrubbed: 1,
      magicLinksRemoved: 1,
    });

    await expect(store.readAccount("admin@example.com")).resolves.toBeNull();
    await expect(store.readInvitation("hash-received")).resolves.toBeNull();
    await expect(store.readInvitation("hash-issued")).resolves.toMatchObject({
      createdBy: DELETED_ACCOUNT_MARKER,
    });
    // The purged account's pending link goes; other people's stay.
    await expect(store.consumeMagicLink("hash-link", NOW)).resolves.toBeNull();
    await expect(store.consumeMagicLink("hash-other-link", NOW)).resolves.toMatchObject({
      email: "keeper@example.com",
    });
  });

  it("reports nothing purged for an unknown account", async () => {
    await expect(store.purgeUserData("ghost@example.com")).resolves.toEqual({
      accountDeleted: false,
      invitationsRemoved: 0,
      invitationsScrubbed: 0,
      magicLinksRemoved: 0,
    });
  });

  describe("magic links", () => {
    it("hands back a pending link once, then never again", async () => {
      await store.saveMagicLink("hash-link", makeMagicLink());

      await expect(store.consumeMagicLink("hash-link", NOW)).resolves.toMatchObject({
        consent,
        email: "candidate@example.com",
      });
      // Redemption deleted the row: a replay of the same link is refused.
      await expect(store.consumeMagicLink("hash-link", NOW)).resolves.toBeNull();
    });

    it("keeps a lead's intent with the link, and hands it back on redemption", async () => {
      const intent = {
        kind: "ats_scan",
        scanId: "3f2b8c1e-5d4a-4b6f-9a8e-1c2d3e4f5a6b",
      } as const;

      await store.saveMagicLink("hash-lead", makeMagicLink({ intent }));

      await expect(store.consumeMagicLink("hash-lead", NOW)).resolves.toMatchObject({
        intent,
      });
    });

    it("reads a link without intent as none", async () => {
      await store.saveMagicLink("hash-plain", makeMagicLink());

      await expect(store.consumeMagicLink("hash-plain", NOW)).resolves.toMatchObject({
        intent: null,
      });
    });

    it("refuses an expired link and an unknown one", async () => {
      await store.saveMagicLink(
        "hash-expired",
        makeMagicLink({ expiresAt: "2026-04-23T08:00:00.000Z" }),
      );

      await expect(store.consumeMagicLink("hash-expired", NOW)).resolves.toBeNull();
      await expect(store.consumeMagicLink("hash-unknown", NOW)).resolves.toBeNull();
    });

    it("purges only the links that have expired", async () => {
      await store.saveMagicLink(
        "hash-expired",
        makeMagicLink({ expiresAt: "2026-04-23T08:00:00.000Z" }),
      );
      await store.saveMagicLink("hash-pending", makeMagicLink());

      await expect(store.purgeExpiredMagicLinks(NOW)).resolves.toBe(1);
      await expect(store.consumeMagicLink("hash-pending", NOW)).resolves.not.toBeNull();
    });
  });
});
