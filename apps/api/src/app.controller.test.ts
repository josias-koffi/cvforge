import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller";

describe("AppController", () => {
  it("returns an ok health payload", () => {
    const controller = new AppController();

    expect(controller.health()).toEqual({
      status: "ok",
      service: "api",
    });
  });
});
