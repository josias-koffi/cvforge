import { describe, expect, it, vi } from "vitest";
import nextConfig from "../next.config";

describe("landing next config", () => {
  it("only overrides the build output directory when NEXT_DIST_DIR is set", () => {
    expect(nextConfig).toEqual({});
  });

  it("uses NEXT_DIST_DIR when provided", async () => {
    process.env.NEXT_DIST_DIR = "tmp/cvforge-landing-next";
    vi.resetModules();
    const { default: configured } = await import("../next.config");
    delete process.env.NEXT_DIST_DIR;
    vi.resetModules();

    expect(configured).toEqual({ distDir: "tmp/cvforge-landing-next" });
  });

  it("ignores absolute NEXT_DIST_DIR values", async () => {
    process.env.NEXT_DIST_DIR = "/tmp/cvforge-landing-next";
    vi.resetModules();
    const { default: configured } = await import("../next.config");
    delete process.env.NEXT_DIST_DIR;
    vi.resetModules();

    expect(configured).toEqual({});
  });
});
