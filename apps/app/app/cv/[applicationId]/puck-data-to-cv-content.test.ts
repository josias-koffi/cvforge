import { describe, expect, it } from "vitest";
import { puckDataToCvContent } from "./puck-data-to-cv-content";
import type { PuckData } from "@cvforge/types";

const emptyData: PuckData = {
  content: [],
  root: { props: {} },
};

const fullPuckData: PuckData = {
  content: [
    {
      type: "CVHeader",
      props: {
        id: "cv-header",
        city: "Paris",
        email: "alice@example.com",
        firstName: "Alice",
        github: "github.com/alice",
        lastName: "Martin",
        linkedin: "linkedin.com/in/alice",
        phone: "+33611223344",
        title: "Staff Engineer",
      },
    },
    { type: "Divider", props: { id: "divider-summary", style: "solid" } },
    {
      type: "SectionTitle",
      props: { id: "section-profil", label: "Profil", style: "accent" },
    },
    {
      type: "SummaryBlock",
      props: { id: "summary", summary: "Expert TypeScript developer" },
    },
    { type: "Divider", props: { id: "divider-exp", style: "solid" } },
    {
      type: "SectionTitle",
      props: { id: "section-exp", label: "Expériences", style: "accent" },
    },
    {
      type: "ExperienceItem",
      props: {
        id: "exp-0",
        achievements: ["Improved performance"],
        company: "TechCorp",
        description: "Led platform",
        endDate: "Present",
        position: "Staff Engineer",
        startDate: "2020",
      },
    },
    {
      type: "EducationItem",
      props: {
        id: "edu-0",
        description: "Computer science and distributed systems.",
        degree: "Master",
        institution: "Paris XI",
        mention: "TB",
        year: "2015",
      },
    },
    {
      type: "SkillsList",
      props: {
        id: "skills",
        hardSkills: ["TypeScript", "React"],
        softSkills: ["Mentoring"],
      },
    },
    {
      type: "SummaryBlock",
      props: { id: "interests", summary: "Trail running, photography" },
    },
    {
      type: "LanguageItem",
      props: { id: "lang-0", language: "English", level: "C1" },
    },
    {
      type: "CertificationItem",
      props: { id: "cert-0", issuer: "AWS", title: "SAA", year: "2024" },
    },
    {
      type: "ProjectItem",
      props: {
        id: "proj-0",
        description: "Open source",
        title: "MyLib",
        url: "https://mylib.dev",
      },
    },
  ],
  root: { props: {} },
};

describe("puckDataToCvContent", () => {
  it("returns empty CVDocumentContent for empty Puck data", () => {
    const result = puckDataToCvContent(emptyData);

    expect(result.candidate.firstName).toBe("");
    expect(result.candidate.summary).toBe("");
    expect(result.experiences).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.interests).toBe("");
    expect(result.skills.hard).toEqual([]);
    expect(result.skills.soft).toEqual([]);
  });

  it("extracts candidate identity from CVHeader block", () => {
    const result = puckDataToCvContent(fullPuckData);

    expect(result.candidate.firstName).toBe("Alice");
    expect(result.candidate.lastName).toBe("Martin");
    expect(result.candidate.email).toBe("alice@example.com");
    expect(result.candidate.city).toBe("Paris");
    expect(result.candidate.title).toBe("Staff Engineer");
  });

  it("extracts summary from SummaryBlock", () => {
    const result = puckDataToCvContent(fullPuckData);

    expect(result.candidate.summary).toBe("Expert TypeScript developer");
  });

  it("extracts all ExperienceItem blocks into experiences array", () => {
    const result = puckDataToCvContent(fullPuckData);

    expect(result.experiences).toHaveLength(1);
    expect(result.experiences[0].company).toBe("TechCorp");
    expect(result.experiences[0].position).toBe("Staff Engineer");
    expect(result.experiences[0].achievements).toEqual([
      "Improved performance",
    ]);
  });

  it("extracts all EducationItem blocks into education array", () => {
    const result = puckDataToCvContent(fullPuckData);

    expect(result.education).toHaveLength(1);
    expect(result.education[0].degree).toBe("Master");
    expect(result.education[0].institution).toBe("Paris XI");
    expect(result.education[0].description).toBe(
      "Computer science and distributed systems.",
    );
  });

  it("extracts interests from the dedicated SummaryBlock", () => {
    const result = puckDataToCvContent(fullPuckData);

    expect(result.interests).toBe("Trail running, photography");
    expect(result.candidate.summary).toBe("Expert TypeScript developer");
  });

  it("maps hardSkills/softSkills from SkillsList to skills.hard/soft", () => {
    const result = puckDataToCvContent(fullPuckData);

    expect(result.skills.hard).toEqual(["TypeScript", "React"]);
    expect(result.skills.soft).toEqual(["Mentoring"]);
  });

  it("extracts language, certification, and project blocks", () => {
    const result = puckDataToCvContent(fullPuckData);

    expect(result.languages).toEqual([{ language: "English", level: "C1" }]);
    expect(result.certifications).toEqual([
      { issuer: "AWS", title: "SAA", year: "2024" },
    ]);
    expect(result.projects).toEqual([
      { description: "Open source", title: "MyLib", url: "https://mylib.dev" },
    ]);
  });

  it("skips Divider and SectionTitle blocks", () => {
    const result = puckDataToCvContent(fullPuckData);

    expect(result.experiences).toHaveLength(1);
    expect(result.education).toHaveLength(1);
  });

  it("handles non-string prop values gracefully", () => {
    const data: PuckData = {
      content: [
        {
          type: "CVHeader",
          props: { id: "h", firstName: 42, lastName: null, city: undefined },
        },
      ],
      root: { props: {} },
    };
    const result = puckDataToCvContent(data);

    expect(result.candidate.firstName).toBe("42");
    expect(result.candidate.lastName).toBe("");
    expect(result.candidate.city).toBe("");
  });
});
