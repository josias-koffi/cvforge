import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PgAuthAccountStore } from "../auth/auth.pg-store";
import type { AuthConsentRecord } from "../auth/auth.types";
import { importLegacyAuth } from "./import-legacy-auth";
import { createTestDatabase, type TestDatabase } from "./testing/test-database";

const consent: AuthConsentRecord = {
  acceptedAt: "2026-04-23T08:10:10.000Z",
  source: "passwordless",
  version: "2026-04-mvp",
};

describe("importLegacyAuth", () => {
  let testDatabase: TestDatabase;
  let store: PgAuthAccountStore;
  const directory = mkdtempSync(join(tmpdir(), "cvforge-legacy-auth-"));
  let fileCounter = 0;

  function writeState(state: Record<string, unknown>) {
    const filePath = join(directory, `state-${(fileCounter += 1)}.json`);

    writeFileSync(filePath, JSON.stringify(state));

    return filePath;
  }

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

  it("records a missing file as imported, with nothing to copy", async () => {
    const result = await importLegacyAuth(
      testDatabase.db,
      join(directory, "does-not-exist.json"),
    );

    expect(result).toEqual({
      status: "imported",
      accounts: 0,
      invitations: 0,
      bootstrapConsumed: false,
    });
  });

  it("copies accounts and invitations in", async () => {
    const filePath = writeState({
      accounts: {
        "admin@example.com": { consent, role: "admin" },
        "user@example.com": { consent: null, role: "user" },
      },
      bootstrapConsumed: true,
      invitations: {
        "hash-1": {
          consumedAt: null,
          createdAt: "2026-04-23T08:00:00.000Z",
          createdBy: "admin@example.com",
          email: "invitee@example.com",
          expiresAt: "2099-01-01T00:00:00.000Z",
          role: "user",
        },
      },
    });

    const result = await importLegacyAuth(testDatabase.db, filePath);

    expect(result).toEqual({
      status: "imported",
      accounts: 2,
      invitations: 1,
      bootstrapConsumed: true,
    });
    await expect(store.readAccount("admin@example.com")).resolves.toEqual({
      consent,
      role: "admin",
    });
    await expect(store.readInvitation("hash-1")).resolves.toMatchObject({
      createdBy: "admin@example.com",
      email: "invitee@example.com",
    });
  });

  it("runs once per environment", async () => {
    const filePath = writeState({ accounts: {}, invitations: {} });

    await importLegacyAuth(testDatabase.db, filePath);

    await expect(importLegacyAuth(testDatabase.db, filePath)).resolves.toEqual({
      status: "already_imported",
    });
  });

  it("keeps a spent bootstrap spent even with no admin left", async () => {
    // What purging the last admin leaves behind. Recomputing the latch from
    // "is there an admin" would hand admin to the next person to sign in.
    const filePath = writeState({
      accounts: { "user@example.com": { consent, role: "user" } },
      bootstrapConsumed: true,
      invitations: {},
    });

    await importLegacyAuth(testDatabase.db, filePath);

    await expect(store.resolveRole("next@example.com", consent)).resolves.toBe(
      "user",
    );
  });

  it("marks the bootstrap spent when the file forgot to", async () => {
    const filePath = writeState({
      accounts: { "admin@example.com": { consent, role: "admin" } },
      bootstrapConsumed: false,
      invitations: {},
    });

    const result = await importLegacyAuth(testDatabase.db, filePath);

    expect(result).toMatchObject({ bootstrapConsumed: true });
    await expect(store.resolveRole("next@example.com", consent)).resolves.toBe(
      "user",
    );
  });

  it("leaves the bootstrap open for an environment that never had an account", async () => {
    const filePath = writeState({
      accounts: {},
      bootstrapConsumed: false,
      invitations: {},
    });

    await importLegacyAuth(testDatabase.db, filePath);

    await expect(store.resolveRole("first@example.com", consent)).resolves.toBe(
      "admin",
    );
  });
});
