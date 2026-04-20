import { describe, expect, it } from "vitest";
import { resolveApplicationsConfig } from "./applications.config";

describe("resolveApplicationsConfig", () => {
  it("uses the default state file when no override is provided", () => {
    const config = resolveApplicationsConfig({});

    expect(config.stateFilePath).toContain(".data/applications-state.json");
  });

  it("uses the configured state file override when present", () => {
    const config = resolveApplicationsConfig({
      APPLICATIONS_STATE_FILE: "/tmp/cvforge-applications.json",
    });

    expect(config.stateFilePath).toBe("/tmp/cvforge-applications.json");
  });
});
