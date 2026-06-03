import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../next.config";

describe("app next config", () => {
  afterEach(() => {
    delete process.env.NEXT_DIST_DIR;
    vi.resetModules();
  });

  it("keeps the server action body limit for large document payloads", () => {
    expect(nextConfig).toMatchObject({
      experimental: {
        middlewareClientMaxBodySize: "16mb",
        serverActions: {
          bodySizeLimit: "16mb",
        },
      },
    });
    expect(nextConfig).not.toHaveProperty("transpilePackages");
  });

  it("uses a project-local NEXT_DIST_DIR when provided", async () => {
    process.env.NEXT_DIST_DIR = "tmp/cvforge-app-next";
    vi.resetModules();
    const { default: configured } = await import("../next.config");

    expect(configured).toMatchObject({
      distDir: "tmp/cvforge-app-next",
      experimental: {
        middlewareClientMaxBodySize: "16mb",
        serverActions: {
          bodySizeLimit: "16mb",
        },
      },
    });
  });

  it("ignores absolute NEXT_DIST_DIR values", async () => {
    process.env.NEXT_DIST_DIR = "/tmp/cvforge-app-next";
    vi.resetModules();
    const { default: configured } = await import("../next.config");

    expect(configured).not.toHaveProperty("distDir");
    expect(configured).not.toHaveProperty("transpilePackages");
  });
});
