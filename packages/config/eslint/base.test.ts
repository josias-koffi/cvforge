import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require("./base.cjs");

describe("base eslint config", () => {
  it("exports the shared ignore rules", () => {
    expect(config).toEqual([
      {
        ignores: ["dist/**", ".next/**", "coverage/**"],
      },
    ]);
  });
});
