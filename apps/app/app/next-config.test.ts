import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("app next config", () => {
  it("includes @puckeditor/core in transpilePackages for SSR-safe Puck integration", () => {
    expect(nextConfig).toMatchObject({
      transpilePackages: expect.arrayContaining(["@puckeditor/core"]),
    });
  });
});
