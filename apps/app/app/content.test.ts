import { describe, expect, it } from "vitest";
import { appContent } from "./content";
import { getAppNavigation } from "./content";

describe("appContent", () => {
  it("exposes the candidate application copy", () => {
    expect(appContent.title).toContain("CVforge");
    expect(appContent.description.length).toBeGreaterThan(10);
  });

  it("includes all required nav items for user role", () => {
    const navigation = getAppNavigation("/dashboard", "user");
    const hrefs = navigation.map((item) => item.href);

    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/candidatures");
    expect(hrefs).toContain("/interview");
    expect(hrefs).toContain("/credits");
    expect(hrefs).toContain("/profile");
    expect(hrefs).toContain("/notifications");
    expect(hrefs).not.toContain("/admin");
  });

  it("includes admin nav item for admin role", () => {
    const navigation = getAppNavigation("/dashboard", "admin");
    const hrefs = navigation.map((item) => item.href);

    expect(hrefs).toContain("/admin");
  });

  it("hides admin nav item when no role is passed", () => {
    const navigation = getAppNavigation("/dashboard");
    const hrefs = navigation.map((item) => item.href);

    expect(hrefs).not.toContain("/admin");
  });

  it("marks the active route", () => {
    const navigation = getAppNavigation("/candidatures", "user");
    const active = navigation.find((item) => item.isActive);

    expect(active?.href).toBe("/candidatures");
  });
});
