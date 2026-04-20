import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileAuthAccountStore } from "./auth-account-store";

const tempDirs: string[] = [];

function createStateFilePath() {
  const directory = mkdtempSync(join(tmpdir(), "cvforge-auth-store-"));

  tempDirs.push(directory);

  return join(directory, "auth-state.json");
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("FileAuthAccountStore", () => {
  it("should promote only the first stored account to admin and persist the bootstrap lock", () => {
    const stateFilePath = createStateFilePath();
    const store = new FileAuthAccountStore(stateFilePath);

    expect(store.resolveRole("admin@example.com")).toBe("admin");
    expect(store.resolveRole("admin@example.com")).toBe("admin");
    expect(store.resolveRole("user@example.com")).toBe("user");

    expect(JSON.parse(readFileSync(stateFilePath, "utf8"))).toEqual({
      accounts: {
        "admin@example.com": { consent: null, role: "admin" },
        "user@example.com": { consent: null, role: "user" },
      },
      bootstrapConsumed: true,
      invitations: {},
    });
  });

  it("should persist invitations, mark them consumed once, and elevate invited admins", () => {
    const stateFilePath = createStateFilePath();
    const store = new FileAuthAccountStore(stateFilePath);

    store.saveInvitation("token-hash", {
      consumedAt: null,
      createdAt: "2026-04-20T06:55:06.000Z",
      createdBy: "admin@example.com",
      email: "invitee@example.com",
      expiresAt: "2026-04-22T06:55:06.000Z",
      role: "admin",
    });

    expect(store.readInvitation("token-hash")).toMatchObject({
      email: "invitee@example.com",
      role: "admin",
    });
    expect(
      store.consumeInvitation("token-hash", "2026-04-20T07:00:00.000Z", Date.UTC(2026, 3, 20, 7)),
    ).toMatchObject({
      consumedAt: "2026-04-20T07:00:00.000Z",
    });
    expect(
      store.consumeInvitation("token-hash", "2026-04-20T07:01:00.000Z", Date.UTC(2026, 3, 20, 7, 1)),
    ).toBeNull();
    expect(
      store.assignInvitedRole("invitee@example.com", "admin", {
        acceptedAt: "2026-04-20T07:00:00.000Z",
        source: "invitation",
        version: "2026-04-mvp",
      }),
    ).toBe("admin");
    expect(JSON.parse(readFileSync(stateFilePath, "utf8"))).toEqual({
      accounts: {
        "invitee@example.com": {
          consent: {
            acceptedAt: "2026-04-20T07:00:00.000Z",
            source: "invitation",
            version: "2026-04-mvp",
          },
          role: "admin",
        },
      },
      bootstrapConsumed: true,
      invitations: {
        "token-hash": {
          consumedAt: "2026-04-20T07:00:00.000Z",
          createdAt: "2026-04-20T06:55:06.000Z",
          createdBy: "admin@example.com",
          email: "invitee@example.com",
          expiresAt: "2026-04-22T06:55:06.000Z",
          role: "admin",
        },
      },
    });
  });

  it("should recover from an invalid persisted state file", () => {
    const stateFilePath = createStateFilePath();

    writeFileSync(stateFilePath, "{not-json");

    const store = new FileAuthAccountStore(stateFilePath);

    expect(store.resolveRole("first@example.com")).toBe("admin");
  });
});
