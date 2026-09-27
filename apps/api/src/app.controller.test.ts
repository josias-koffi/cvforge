import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("AppController", () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = original;
  });

  it("returns an ok health payload carrying the running version", async () => {
    process.env.APP_VERSION = "abc1234";
    const { AppController } = await import("./app.controller");

    expect(new AppController().health()).toEqual({
      status: "ok",
      service: "api",
      version: "abc1234",
    });
  });

  it("reports an empty version when the build is not stamped", async () => {
    delete process.env.APP_VERSION;
    const { AppController } = await import("./app.controller");

    expect(new AppController().health().version).toBe("");
  });
});
