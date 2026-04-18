import { describe, expect, it } from "vitest";
import {
  HEALTH_STATUS_OK,
  type Locale,
  type ServiceHealth,
  supportedLocales,
} from "./index";

describe("types package", () => {
  it("should allow the supported locales", () => {
    const locale: Locale = "fr";

    expect(locale).toBe("fr");
    expect(supportedLocales).toEqual(["fr", "en"]);
  });

  it("should shape the service health contract", () => {
    const health: ServiceHealth = {
      status: HEALTH_STATUS_OK,
      service: "api",
    };

    expect(health).toEqual({
      status: "ok",
      service: "api",
    });
  });
});
