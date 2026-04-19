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
        "admin@example.com": { role: "admin" },
        "user@example.com": { role: "user" },
      },
      bootstrapConsumed: true,
    });
  });

  it("should recover from an invalid persisted state file", () => {
    const stateFilePath = createStateFilePath();

    writeFileSync(stateFilePath, "{not-json");

    const store = new FileAuthAccountStore(stateFilePath);

    expect(store.resolveRole("first@example.com")).toBe("admin");
  });
});
