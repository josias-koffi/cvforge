import { describe, expect, it } from "vitest";
import { landingContent } from "./content";

describe("landingContent", () => {
  it("exposes the marketing shell copy", () => {
    expect(landingContent.title).toContain("Landing");
    expect(landingContent.description.length).toBeGreaterThan(10);
  });
});
