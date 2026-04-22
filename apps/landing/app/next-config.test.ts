import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("landing next config", () => {
  it("only overrides the build output directory when NEXT_DIST_DIR is set", () => {
    expect(nextConfig).toEqual({});
  });
});
