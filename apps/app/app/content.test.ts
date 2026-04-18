import { describe, expect, it } from "vitest";
import { appContent } from "./content";

describe("appContent", () => {
  it("exposes the candidate application copy", () => {
    expect(appContent.title).toContain("CVforge");
    expect(appContent.description.length).toBeGreaterThan(10);
  });
});
