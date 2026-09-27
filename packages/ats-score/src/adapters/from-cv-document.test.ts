import type { CVDocumentContent } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import { fromCvDocument } from "./from-cv-document";

function makeContent(
  overrides: Partial<CVDocumentContent> = {},
): CVDocumentContent {
  return {
    candidate: {
      city: "Lyon",
      email: "alex@example.com",
      firstName: "Alex",
      github: "",
      lastName: "Martin",
      linkedin: "linkedin.com/in/alex",
      phone: "0612345678",
      summary: "Ingénieur plateforme.",
      title: "Ingénieur plateforme",
    },
    certifications: [],
    education: [],
    experiences: [],
    interests: "",
    languages: [],
    projects: [],
    skills: { hard: [], soft: [] },
    ...overrides,
  };
}

function makeExperience(
  overrides: Partial<CVDocumentContent["experiences"][number]> = {},
) {
  return {
    achievements: ["Réduit le build de 40%."],
    company: "Acme",
    description: "",
    endDate: "present",
    position: "Ingénieur",
    startDate: "01/2022",
    ...overrides,
  };
}

describe("fromCvDocument — sections", () => {
  it("reports a section present only when it holds something", () => {
    const empty = fromCvDocument(makeContent()).sections;

    expect(empty.experience).toBe(false);
    expect(empty.education).toBe(false);
    expect(empty.skills).toBe(false);
    expect(empty.languages).toBe(false);
    expect(empty.certifications).toBe(false);
  });

  it("treats a blank summary as no summary at all", () => {
    const content = makeContent();
    content.candidate.summary = "   ";

    expect(fromCvDocument(content).sections.summary).toBe(false);
  });

  it("merges hard and soft skills into one list", () => {
    const doc = fromCvDocument(
      makeContent({ skills: { hard: ["TypeScript"], soft: ["Mentorat"] } }),
    );

    expect(doc.skills).toEqual(["TypeScript", "Mentorat"]);
    expect(doc.sections.skills).toBe(true);
  });
});

describe("fromCvDocument — contact", () => {
  it("counts a project URL as a portfolio when there is no GitHub", () => {
    const doc = fromCvDocument(
      makeContent({
        projects: [
          { description: "", title: "Site", url: "https://alex.dev" },
        ],
      }),
    );

    expect(doc.contact.portfolio).toBe(true);
  });

  it("reports no portfolio when neither GitHub nor a project URL is given", () => {
    expect(fromCvDocument(makeContent()).contact.portfolio).toBe(false);
  });

  it("ignores a project listed without a URL", () => {
    const doc = fromCvDocument(
      makeContent({
        projects: [{ description: "Un projet", title: "Interne", url: "" }],
      }),
    );

    expect(doc.contact.portfolio).toBe(false);
  });
});

describe("fromCvDocument — experiences", () => {
  /**
   * `description` is prose about the role; leaving it out would hide it from
   * the impact rules that judge how the work is written up.
   */
  it("promotes a filled description to the first bullet", () => {
    const doc = fromCvDocument(
      makeContent({
        experiences: [
          makeExperience({ description: "Piloté la refonte de la plateforme." }),
        ],
      }),
    );

    expect(doc.experiences[0]?.bullets).toEqual([
      "Piloté la refonte de la plateforme.",
      "Réduit le build de 40%.",
    ]);
  });

  it("adds nothing when the description is blank", () => {
    const doc = fromCvDocument(
      makeContent({ experiences: [makeExperience({ description: "  " })] }),
    );

    expect(doc.experiences[0]?.bullets).toEqual(["Réduit le build de 40%."]);
  });

  it("drops empty achievements rather than counting them as bullets", () => {
    const doc = fromCvDocument(
      makeContent({
        experiences: [makeExperience({ achievements: ["Fait.", "", "   "] })],
      }),
    );

    expect(doc.experiences[0]?.bullets).toEqual(["Fait."]);
    expect(doc.bulletCount).toBe(1);
  });

  it("maps position to role and keeps the dates as written", () => {
    const doc = fromCvDocument(
      makeContent({ experiences: [makeExperience()] }),
    );

    expect(doc.experiences[0]?.role).toBe("Ingénieur");
    expect(doc.experiences[0]?.startDate).toBe("01/2022");
    expect(doc.experiences[0]?.endDate).toBe("present");
  });
});

describe("fromCvDocument — flat text", () => {
  it("renders education, certifications and interests into the text", () => {
    const doc = fromCvDocument(
      makeContent({
        certifications: [{ issuer: "CNCF", title: "CKA", year: "2023" }],
        education: [
          {
            degree: "Master informatique",
            description: "Systèmes répartis.",
            institution: "Université de Lyon",
            mention: "Bien",
            year: "2016",
          },
        ],
        interests: "Lutherie.",
      }),
    );

    expect(doc.rawText).toContain("Master informatique");
    expect(doc.rawText).toContain("CKA");
    expect(doc.rawText).toContain("Lutherie.");
    expect(doc.educationCount).toBe(1);
  });

  it("counts the words of what it rendered", () => {
    expect(fromCvDocument(makeContent()).wordCount).toBeGreaterThan(0);
  });
});
