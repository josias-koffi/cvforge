import { describe, expect, it } from "vitest";
import {
  classifyContract,
  htmlToText,
  normalizeLocation,
} from "./job-listing.normalize";

describe("classifyContract", () => {
  it.each([
    ["Stagiaire Marketing (H/F)", "stage"],
    ["Software Engineer Intern", "stage"],
    ["Alternant·e Développeur Web", "alternance"],
    ["Apprenticeship - Data Analyst", "alternance"],
    ["Business Developer - Work Study", "alternance"],
    ["Chef de projet (CDD 6 mois)", "cdd"],
    ["Senior Engineer - CDI", "cdi"],
    ["Account Executive - Unlimited Contract", "cdi"],
    ["Consultant freelance SEO", "freelance"],
    ["VIE - Business Analyst Singapour", "vie"],
  ])("reads %j as %j", (title, expected) => {
    expect(classifyContract({ title })).toBe(expected);
  });

  it("reads the employment type when the title says nothing", () => {
    expect(
      classifyContract({ employmentType: "Internship", title: "Data Analyst" }),
    ).toBe("stage");
    expect(
      classifyContract({ employmentType: "Permanent", title: "Data Analyst" }),
    ).toBe("cdi");
  });

  it("answers unknown rather than guessing", () => {
    expect(classifyContract({ title: "Data Analyst" })).toBe("unknown");
    expect(classifyContract({})).toBe("unknown");
  });

  it("lets the title win over a description that merely mentions alternance", () => {
    // "Vous encadrerez nos alternants" does not make this an alternance.
    expect(
      classifyContract({
        description: "Poste en CDI. Vous encadrerez nos alternants et stagiaires.",
        title: "Lead Developer (CDI)",
      }),
    ).toBe("cdi");
  });
});

describe("normalizeLocation", () => {
  it("keeps a French city and names its department", () => {
    expect(normalizeLocation("Paris, France")).toMatchObject({
      department: "75",
      inFrance: true,
      remote: false,
    });
    expect(normalizeLocation("Nantes (44)").department).toBe("44");
    expect(normalizeLocation("Aix-en-Provence").department).toBe("13");
  });

  it("rejects a job abroad", () => {
    expect(normalizeLocation("Berlin, Berlin, Germany")).toMatchObject({
      department: "",
      inFrance: false,
    });
  });

  it("reads the country hint a board sends separately", () => {
    expect(
      normalizeLocation("Bourg-en-Bresse", { countryHint: "fr" }).inFrance,
    ).toBe(true);
    expect(
      normalizeLocation("Austin, TX", { countryHint: "us" }).inFrance,
    ).toBe(false);
  });

  it("spots remote work, from the text or from the board's own flag", () => {
    expect(normalizeLocation("Remote, Brasil").remote).toBe(true);
    expect(normalizeLocation("Télétravail total").remote).toBe(true);
    expect(normalizeLocation("Lyon", { remoteHint: true }).remote).toBe(true);
  });

  it("keeps an unknown French city, without a department", () => {
    expect(normalizeLocation("Bourg-en-Bresse, France")).toMatchObject({
      department: "",
      inFrance: true,
    });
  });
});

describe("htmlToText", () => {
  it("reads plain HTML", () => {
    expect(htmlToText("<p>Bonjour</p><p>Au revoir</p>")).toBe("Bonjour\nAu revoir");
  });

  it("reads the double-escaped HTML Greenhouse serves", () => {
    // What arrives after JSON parsing: the tags are entities, not markup.
    expect(htmlToText("&lt;p&gt;&lt;strong&gt;Poste&lt;/strong&gt;&lt;/p&gt;")).toBe(
      "Poste",
    );
  });

  it("decodes the entities left in the text", () => {
    expect(htmlToText("<p>R&amp;D &quot;avancée&quot;&nbsp;: l&#39;équipe</p>")).toBe(
      'R&D "avancée" : l\'équipe',
    );
  });

  it("drops scripts and styles entirely", () => {
    expect(htmlToText("<script>alert(1)</script><p>Texte</p>")).toBe("Texte");
  });
});
