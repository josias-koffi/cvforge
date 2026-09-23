import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEnvironmentFiles } from "./env";

const KEY = "CVFORGE_ENV_LOADER_PROBE";

afterEach(() => {
  delete process.env[KEY];
});

function makeTree(): string {
  return mkdtempSync(join(tmpdir(), "cvforge-env-"));
}

describe("loadEnvironmentFiles", () => {
  it("reads the .env sitting next to the script", () => {
    const root = makeTree();
    writeFileSync(resolve(root, ".env"), `${KEY}=proche\n`);

    loadEnvironmentFiles(root);

    expect(process.env[KEY]).toBe("proche");
  });

  it("falls back on the repository root, two levels up", () => {
    // A script run from apps/api finds the monorepo .env, like the server does.
    const root = makeTree();
    const nested = resolve(root, "apps", "api");
    mkdirSync(nested, { recursive: true });
    writeFileSync(resolve(root, ".env"), `${KEY}=racine\n`);

    loadEnvironmentFiles(nested);

    expect(process.env[KEY]).toBe("racine");
  });

  it("stays silent when there is no .env at all", () => {
    expect(() => loadEnvironmentFiles(makeTree())).not.toThrow();
    expect(process.env[KEY]).toBeUndefined();
  });
});
