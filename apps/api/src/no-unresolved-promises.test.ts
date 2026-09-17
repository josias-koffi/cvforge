import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the failure that reached staging: a controller building its response
 * from a store-backed service call without awaiting it. Controller methods
 * carry no declared return type, so `{ applications: Promise<…> }`
 * type-checks, then serialises to `{}` and the front-end fails on something
 * that is not iterable. Worse, `if (!value)` on a promise is always false, so
 * a guard meant to raise a 404 silently stops firing.
 *
 * Nest resolves a promise that is *returned* directly, so `return this.x()`
 * is fine; only a captured or nested one is a problem.
 */

function sourceFiles(pattern: string) {
  return globSync(pattern, { cwd: process.cwd() }).filter(
    (file) => !file.endsWith(".test.ts"),
  );
}

/** Method names that actually return a promise, read from the services. */
function asyncServiceMethods() {
  const names = new Set<string>();

  for (const file of sourceFiles("src/**/*.service.ts")) {
    const source = readFileSync(join(process.cwd(), file), "utf8");

    // `async *` generators are consumed with `for await`, not awaited, so
    // capturing one is correct and must not be flagged.
    for (const match of source.matchAll(
      /^ {2}(?:private |public )?async (\w+)\(/gm,
    )) {
      names.add(match[1]!);
    }

    for (const match of source.matchAll(
      /^ {2}(?:private |public )?(\w+)\([^)]*\)\s*:\s*Promise</gm,
    )) {
      names.add(match[1]!);
    }
  }

  return names;
}

describe("controllers", () => {
  it("never puts an unresolved promise in a response", () => {
    const asyncMethods = asyncServiceMethods();

    expect(asyncMethods.size).toBeGreaterThan(20);

    const offenders: string[] = [];

    for (const file of sourceFiles("src/**/*.controller.ts")) {
      const source = readFileSync(join(process.cwd(), file), "utf8");

      source.split("\n").forEach((line, index) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("return this.") || line.includes("await ")) {
          return;
        }

        const call = /this\.\w+\.(\w+)\(/.exec(line);

        if (!call || !asyncMethods.has(call[1]!)) {
          return;
        }

        const captured =
          trimmed.startsWith("const ") ||
          trimmed.startsWith("let ") ||
          /^\w+:/.test(trimmed);

        if (captured) {
          offenders.push(`${file}:${index + 1} ${trimmed}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});
