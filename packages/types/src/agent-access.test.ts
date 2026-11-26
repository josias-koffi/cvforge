import { describe, expect, it } from "vitest";
import { AGENT_SCOPE_PRESETS, closestAgentScopePreset } from "./agent-access";

describe("closestAgentScopePreset", () => {
  it("offers the extension preset to the extension, never full access", () => {
    expect(closestAgentScopePreset([...AGENT_SCOPE_PRESETS.extension])).toBe(
      "extension",
    );
  });

  it("picks the narrowest preset that covers the request", () => {
    expect(closestAgentScopePreset(["jobs:read", "credits:read"])).toBe(
      "readOnly",
    );
    expect(closestAgentScopePreset(["applications:write"])).toBe("extension");
    expect(closestAgentScopePreset(["profile:write"])).toBe("assistant");
  });

  it("falls back to full access when nothing was asked", () => {
    expect(closestAgentScopePreset([])).toBe("assistant");
  });
});
