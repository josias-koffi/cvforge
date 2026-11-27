import { describe, expect, it } from "vitest";
import { badgeFor, fillable, knownOfferFor, type PageSignals } from "./badge";

const FORM: PageSignals = { applyLink: null, fieldCount: 8, fileInput: true };
const NOTHING: PageSignals = {
  applyLink: null,
  fieldCount: 2,
  fileInput: false,
};
const OFFER = {
  score: 82.4,
  title: "Dev front",
  url: "https://jobs.lever.co/acme/1?utm_source=jobspark",
};

describe("badgeFor (US-207)", () => {
  it("shows the score of an offer JobSpark knows, on its page and its form", () => {
    const known = knownOfferFor([OFFER], "https://jobs.lever.co/acme/1/apply");
    expect(badgeFor("https://jobs.lever.co/acme/1/apply", FORM, known)).toEqual(
      {
        color: "#16A34A",
        text: "82",
        title:
          "JobSpark : pertinence 82/100 — JobSpark peut remplir ce formulaire",
      },
    );
    expect(
      badgeFor("https://jobs.lever.co/acme/1", NOTHING, {
        ...OFFER,
        score: 40,
      }),
    ).toMatchObject({ color: "#6B7280", text: "40" });
  });

  it("marks a form the extension can fill, or an offer page leading to one", () => {
    expect(
      badgeFor("https://boards.greenhouse.io/b/1", FORM, null),
    ).toMatchObject({
      text: "✓",
      title: "JobSpark peut remplir ce formulaire",
    });
    expect(
      badgeFor(
        "https://acme.teamtailor.com/jobs/1",
        {
          ...NOTHING,
          applyLink: "https://acme.teamtailor.com/jobs/1/applications/new",
        },
        null,
      ),
    ).toMatchObject({ text: "✓" });
  });

  it("stays quiet elsewhere: a search box, a login form, a browser page", () => {
    expect(
      badgeFor("https://www.google.com/search?q=x", NOTHING, null),
    ).toBeNull();
    // A contact form has fields but no CV upload.
    expect(
      badgeFor("https://shop.io/contact", { ...FORM, fileInput: false }, null),
    ).toBeNull();
    expect(badgeFor("chrome://extensions", FORM, null)).toBeNull();
    expect(fillable(null)).toBe(false);
  });

  it("never offers to fill on LinkedIn, only shows a known offer's score", () => {
    const url = "https://www.linkedin.com/jobs/view/1";
    expect(badgeFor(url, FORM, null)).toBeNull();
    expect(badgeFor(url, FORM, { score: 75, title: "Dev", url })).toEqual({
      color: "#16A34A",
      text: "75",
      title: "JobSpark : pertinence 75/100",
    });
  });
});
