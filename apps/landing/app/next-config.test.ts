import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("landing next config", () => {
  it("should export an empty config object for the initial scaffold", () => {
    expect(nextConfig).toEqual({});
  });
});
