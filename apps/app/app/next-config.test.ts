import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../next.config";

describe("app next config", () => {
  afterEach(() => {
    delete process.env.NEXT_DIST_DIR;
    vi.resetModules();
  });

  it("includes @puckeditor/core in transpilePackages for SSR-safe Puck integration", () => {
    expect(nextConfig).toMatchObject({
      transpilePackages: expect.arrayContaining(["@puckeditor/core"]),
    });
  });

  it("uses a project-local NEXT_DIST_DIR when provided", async () => {
    process.env.NEXT_DIST_DIR = "tmp/cvforge-app-next";
    vi.resetModules();
    const { default: configured } = await import("../next.config");

    expect(configured).toMatchObject({
      distDir: "tmp/cvforge-app-next",
      transpilePackages: expect.arrayContaining(["@puckeditor/core"]),
    });
  });

  it("ignores absolute NEXT_DIST_DIR values", async () => {
    process.env.NEXT_DIST_DIR = "/tmp/cvforge-app-next";
    vi.resetModules();
    const { default: configured } = await import("../next.config");

    expect(configured).toMatchObject({
      transpilePackages: expect.arrayContaining(["@puckeditor/core"]),
    });
    expect(configured).not.toHaveProperty("distDir");
  });
});
