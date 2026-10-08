import { describe, expect, it } from "vitest";
import { normalizeIdentity } from "./profiles.normalize";

const BASE = { city: "Paris", email: "a@b.fr", firstName: "Jémima", lastName: "Egla", phone: "" };

describe("normalizeIdentity", () => {
  it("ports the legacy link fields of a profile saved before the links list", () => {
    const identity = normalizeIdentity({
      ...BASE,
      github: "github.com/jemima",
      linkedIn: " https://linkedin.com/in/jemima ",
      otherLink: "",
      portfolio: "jemima.fr",
    });

    expect(identity.links).toEqual([
      { label: "LinkedIn", url: "https://linkedin.com/in/jemima" },
      { label: "GitHub", url: "github.com/jemima" },
      { label: "Portfolio", url: "jemima.fr" },
    ]);
    // Left out, so the next save retires them rather than keeping two sources.
    expect(identity).not.toHaveProperty("github");
  });

  it("recovers the legacy fields of a profile re-saved with an empty list", () => {
    expect(
      normalizeIdentity({ ...BASE, github: "github.com/jemima", links: [] }).links,
    ).toEqual([{ label: "GitHub", url: "github.com/jemima" }]);
  });

  it("keeps the list of a current profile over any leftover field", () => {
    const links = [{ label: "Site", url: "jemima.fr" }];

    expect(normalizeIdentity({ ...BASE, github: "old", links }).links).toEqual(links);
  });

  it("gives an empty list to a profile that never had a link", () => {
    expect(normalizeIdentity(BASE).links).toEqual([]);
  });

  it("keeps known licence categories and defaults older profiles to none", () => {
    expect(normalizeIdentity({ ...BASE, drivingLicenses: ["B", "Z", "A"] }).drivingLicenses).toEqual(["A", "B"]);
    expect(normalizeIdentity(BASE).drivingLicenses).toEqual([]);
  });
});
