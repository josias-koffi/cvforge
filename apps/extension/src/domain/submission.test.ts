import { describe, expect, it } from "vitest";
import { looksConfirmed, siteOf, submitRefusal } from "./submission";

const ok = {
  offerUrl: "https://jobs.lever.co/acme/1",
  pageUrl: "https://jobs.lever.co/acme/1/apply",
  requiredEmpty: [],
  status: "draft",
};

describe("siteOf", () => {
  it("keeps the registrable part of a host", () => {
    expect(siteOf("jobs.lever.co")).toBe("lever.co");
    expect(siteOf("careers.acme.co.uk")).toBe("acme.co.uk");
    expect(siteOf("www.welcometothejungle.com")).toBe("welcometothejungle.com");
    expect(siteOf("candidat.francetravail.fr")).toBe("francetravail.fr");
  });
});

describe("submitRefusal", () => {
  it("lets a draft go on the offer's own site with everything filled", () => {
    expect(submitRefusal(ok)).toBeNull();
    expect(submitRefusal({ ...ok, offerUrl: null })).toBeNull();
  });

  it("refuses LinkedIn and Indeed", () => {
    expect(
      submitRefusal({
        ...ok,
        offerUrl: null,
        pageUrl: "https://www.linkedin.com/jobs/apply/1",
      }),
    ).toContain("interdit");
    expect(
      submitRefusal({
        ...ok,
        offerUrl: null,
        pageUrl: "https://fr.indeed.com/viewjob",
      }),
    ).toContain("interdit");
  });

  it("refuses an application already sent", () => {
    expect(submitRefusal({ ...ok, status: "sent" })).toContain(
      "déjà été envoyée",
    );
  });

  it("refuses a form on another site than the offer's", () => {
    expect(
      submitRefusal({ ...ok, pageUrl: "https://forms.evil.example/apply" }),
    ).toContain("pas sur le site de l'offre (lever.co)");
  });

  it("refuses while a required field is empty", () => {
    expect(submitRefusal({ ...ok, requiredEmpty: ["Téléphone", "CV"] })).toBe(
      "Champs obligatoires encore vides : Téléphone, CV.",
    );
  });
});

describe("looksConfirmed", () => {
  const before = {
    text: "Postuler. Thank you for your interest in Acme!",
    url: "https://jobs.lever.co/acme/1/apply",
  };

  it("reads a confirmation sentence that was not there before", () => {
    expect(
      looksConfirmed(
        {
          text: "Merci pour votre candidature, nous revenons vers vous.",
          url: before.url,
        },
        before,
      ),
    ).toBe(true);
    expect(
      looksConfirmed(
        { text: "Application submitted", url: before.url },
        before,
      ),
    ).toBe(true);
  });

  it("is not fooled by a sentence already on the form page", () => {
    expect(looksConfirmed(before, before)).toBe(false);
  });

  it("accepts a move to a thank-you address, not a mere reload", () => {
    expect(
      looksConfirmed(
        { text: "", url: "https://jobs.lever.co/acme/1/apply/thanks" },
        before,
      ),
    ).toBe(true);
    expect(looksConfirmed({ text: "Erreur", url: before.url }, before)).toBe(
      false,
    );
  });
});
