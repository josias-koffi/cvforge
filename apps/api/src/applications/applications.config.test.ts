import { describe, expect, it } from "vitest";
import { resolveLegacyApplicationsStateFile } from "./applications.config";

describe("resolveLegacyApplicationsStateFile", () => {
  it("defaults to the .data directory", () => {
    expect(resolveLegacyApplicationsStateFile({})).toContain(
      ".data/applications-state.json",
    );
  });

  it("honours the override the deploy may set", () => {
    expect(
      resolveLegacyApplicationsStateFile({
        APPLICATIONS_STATE_FILE: "/tmp/cvforge-applications.json",
      }),
    ).toBe("/tmp/cvforge-applications.json");
  });
});
