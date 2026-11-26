import { describe, expect, it } from "vitest";
import {
  findApplicationFor,
  isOfferPage,
  isWebPage,
  normalizeOfferUrl,
  planPreparation,
  usablePageText,
  type ApplicationSummary,
} from "./offer";

const app = (over: Partial<ApplicationSummary> = {}): ApplicationSummary => ({
  company: "Acme",
  cvGeneratedAt: null,
  id: "a1",
  letterGeneratedAt: null,
  offerUrl: "https://jobs.example.com/offre/42",
  status: "draft",
  title: "Dev",
  ...over,
});

describe("normalizeOfferUrl", () => {
  it("drops fragments, tracking parameters and trailing slashes", () => {
    expect(
      normalizeOfferUrl(
        "https://Jobs.Example.com/offre/42/?utm_source=x&gclid=1&id=7#apply",
      ),
    ).toBe("https://jobs.example.com/offre/42?id=7");
  });

  it("keeps parameters that identify the offer, in a stable order", () => {
    expect(normalizeOfferUrl("https://x.example/jobs?b=2&a=1")).toBe(
      "https://x.example/jobs?a=1&b=2",
    );
  });

  it("refuses what is not a web address", () => {
    expect(normalizeOfferUrl("chrome://newtab")).toBeNull();
    expect(normalizeOfferUrl("pas une url")).toBeNull();
  });
});

describe("findApplicationFor", () => {
  it("finds the application whatever link led to the offer", () => {
    const apps = [app({ id: "other", offerUrl: null }), app()];
    expect(
      findApplicationFor(
        apps,
        "https://jobs.example.com/offre/42/?utm_medium=mail",
      )?.id,
    ).toBe("a1");
    expect(
      findApplicationFor(apps, "https://jobs.example.com/offre/43"),
    ).toBeNull();
    expect(findApplicationFor(apps, "chrome://newtab")).toBeNull();
    expect(
      findApplicationFor(apps, "https://jobs.example.com/offre/42/apply")?.id,
    ).toBe("a1");
  });
});

describe("isOfferPage", () => {
  const offer = "https://jobs.lever.co/agicap/e0aa73bf";
  it("recognises the offer's form at a longer address on the same site", () => {
    expect(isOfferPage(offer, `${offer}/apply`)).toBe(true);
    expect(isOfferPage(offer, `${offer}/apply?lever-source=x#form`)).toBe(true);
    expect(isOfferPage(offer, `${offer}/`)).toBe(true);
  });

  it("does not take a sibling offer or another site for it", () => {
    expect(isOfferPage(offer, "https://jobs.lever.co/agicap/e0aa73bf2")).toBe(
      false,
    );
    expect(isOfferPage(offer, "https://jobs.lever.co/agicap")).toBe(false);
    expect(
      isOfferPage(offer, "https://evil.example/agicap/e0aa73bf/apply"),
    ).toBe(false);
    expect(
      isOfferPage("https://acme.example/", "https://acme.example/jobs/1"),
    ).toBe(false);
  });
});

describe("planPreparation", () => {
  it("costs the whole preparation for a new offer", () => {
    expect(planPreparation(null)).toEqual({
      alreadySent: false,
      cost: 7,
      steps: ["import", "cv", "letter"],
    });
  });

  it("only charges what is missing", () => {
    expect(planPreparation(app({ cvGeneratedAt: "2026-11-26" }))).toEqual({
      alreadySent: false,
      cost: 3,
      steps: ["letter"],
    });
    expect(
      planPreparation(app({ cvGeneratedAt: "x", letterGeneratedAt: "y" }))
        .steps,
    ).toEqual([]);
  });

  it("never prepares an application already sent", () => {
    expect(planPreparation(app({ status: "sent" }))).toEqual({
      alreadySent: true,
      cost: 0,
      steps: [],
    });
  });
});

describe("usablePageText", () => {
  it("keeps a real page and caps its length", () => {
    expect(usablePageText("court")).toBeNull();
    expect(usablePageText("a".repeat(40_000))?.length).toBe(30_000);
  });
});

describe("isWebPage", () => {
  it("accepts http(s) pages only", () => {
    expect(isWebPage("https://x.example")).toBe(true);
    expect(isWebPage("chrome-extension://id/sidepanel.html")).toBe(false);
    expect(isWebPage(undefined)).toBe(false);
  });
});
