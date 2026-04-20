import { describe, expect, it } from "vitest";
import { resolveTemplatesConfig } from "./templates.config";

describe("templates config", () => {
  it("uses the default template state file path", () => {
    const config = resolveTemplatesConfig({});

    expect(config.stateFilePath).toContain(".data/templates-state.json");
  });

  it("allows overriding the template state file path", () => {
    const config = resolveTemplatesConfig({
      TEMPLATES_STATE_FILE: "/tmp/cvforge-templates.json",
    });

    expect(config.stateFilePath).toBe("/tmp/cvforge-templates.json");
  });
});
