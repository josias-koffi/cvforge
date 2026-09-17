import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { DELETED_ACCOUNT_MARKER, PgAuthAccountStore } from "./auth.pg-store";
import type { AuthConsentRecord, AuthInvitation } from "./auth.types";

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

    await expect(store.purgeUserData("admin@example.com")).resolves.toEqual({
      accountDeleted: true,
      invitationsRemoved: 1,
      invitationsScrubbed: 1,
    });

    await expect(store.readAccount("admin@example.com")).resolves.toBeNull();
    await expect(store.readInvitation("hash-received")).resolves.toBeNull();
    await expect(store.readInvitation("hash-issued")).resolves.toMatchObject({
      createdBy: DELETED_ACCOUNT_MARKER,
    });
  });

  it("reports nothing purged for an unknown account", async () => {
    await expect(store.purgeUserData("ghost@example.com")).resolves.toEqual({
      accountDeleted: false,
      invitationsRemoved: 0,
      invitationsScrubbed: 0,
    });
  });
});
