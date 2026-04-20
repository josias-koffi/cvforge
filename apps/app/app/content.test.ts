import { describe, expect, it } from "vitest";
import { appContent } from "./content";
import { getAppNavigation } from "./content";

describe("appContent", () => {
  it("exposes the candidate application copy", () => {
    expect(appContent.title).toContain("CVforge");
    expect(appContent.description.length).toBeGreaterThan(10);
  });

  it("exposes the admin templates navigation entry", () => {
    const navigation = getAppNavigation("/admin/templates");

    expect(navigation.map((item) => item.href)).toContain("/admin/templates");
  });
});
