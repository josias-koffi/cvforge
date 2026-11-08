import { describe, expect, it } from "vitest";
import { anthropicProfile } from "./anthropic.profiles";

describe("anthropicProfile", () => {
  it("raises a small OpenRouter budget to leave room for reasoning", () => {
    expect(anthropicProfile("company_context", 300)).toEqual({
      effort: "low",
      maxOutputTokens: 4_000,
    });
  });

  it("never lowers a budget the call site asked for", () => {
    expect(anthropicProfile("company_context", 9_000).maxOutputTokens).toBe(9_000);
  });

  it("gives an untagged call the generous profile", () => {
    expect(anthropicProfile(undefined, undefined)).toEqual({
      effort: "medium",
      maxOutputTokens: 16_000,
    });
  });
});
