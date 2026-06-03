import { describe, expect, it } from "vitest";
import { cvContentToPuckData } from "./cv-content-to-puck";
import type { CVDocumentContent } from "@cvforge/types";

const minimalCvContent: CVDocumentContent = {
  candidate: {
    city: "Paris",
    email: "jane@example.com",
    firstName: "Jane",
    github: "github.com/jane",
    lastName: "Doe",
    linkedin: "linkedin.com/in/jane",
    phone: "+33600000000",
    summary: "",
    title: "Engineer",
  },
  certifications: [],
  education: [],
  experiences: [],
  interests: "",
  languages: [],
  projects: [],
  skills: { hard: [], soft: [] },
};

const fullCvContent: CVDocumentContent = {
  candidate: {
    city: "Lyon",
    email: "alice@example.com",
    firstName: "Alice",
    github: "github.com/alice",
    lastName: "Martin",
    linkedin: "linkedin.com/in/alice",
    phone: "+33611223344",
    summary: "Senior TypeScript developer",
    title: "Staff Engineer",
  },
  certifications: [{ issuer: "AWS", title: "SAA", year: "2024" }],
  education: [
    {
      description: "Computer science and distributed systems.",
      degree: "Master",
      institution: "Paris XI",
      mention: "TB",
      year: "2015",
    },
  ],
  experiences: [
    {
      achievements: ["Reduced latency by 20%"],
      company: "TechCorp",
      description: "Led platform team",
      endDate: "Present",
      position: "Staff Engineer",
      startDate: "2020",
    },
  ],
  languages: [{ language: "English", level: "C1" }],
  projects: [
    {
      description: "Open source tool",
      title: "MyLib",
      url: "https://mylib.dev",
    },
  ],
  interests: "Trail running, photography",
  skills: { hard: ["TypeScript", "React"], soft: ["Mentoring"] },
};

describe("cvContentToPuckData", () => {
  it("always includes a CVHeader block as first item", () => {
    const result = cvContentToPuckData(minimalCvContent);

    expect(result.content[0].type).toBe("CVHeader");
    const props = result.content[0].props;
    expect(props.firstName).toBe("Jane");
    expect(props.lastName).toBe("Doe");
    expect(props.email).toBe("jane@example.com");
  });

  it("does not add summary section when summary is empty", () => {
    const result = cvContentToPuckData(minimalCvContent);
    const types = result.content.map((item) => item.type);

    expect(types).not.toContain("SummaryBlock");
    expect(types).toContain("CVHeader");
  });

  it("adds SummaryBlock when summary is present", () => {
    const result = cvContentToPuckData(fullCvContent);
    const summaryBlock = result.content.find(
      (item) => item.type === "SummaryBlock",
    );

    expect(summaryBlock).toBeDefined();
    expect(summaryBlock?.props.summary).toBe("Senior TypeScript developer");
  });

  it("maps experiences to ExperienceItem blocks", () => {
    const result = cvContentToPuckData(fullCvContent);
    const expBlocks = result.content.filter(
      (item) => item.type === "ExperienceItem",
    );

    expect(expBlocks).toHaveLength(1);
    expect(expBlocks[0].props.company).toBe("TechCorp");
    expect(expBlocks[0].props.position).toBe("Staff Engineer");
    expect(expBlocks[0].props.achievements).toEqual(["Reduced latency by 20%"]);
  });

  it("maps education to EducationItem blocks", () => {
    const result = cvContentToPuckData(fullCvContent);
    const eduBlocks = result.content.filter(
      (item) => item.type === "EducationItem",
    );

    expect(eduBlocks).toHaveLength(1);
    expect(eduBlocks[0].props.degree).toBe("Master");
    expect(eduBlocks[0].props.institution).toBe("Paris XI");
    expect(eduBlocks[0].props.description).toBe(
      "Computer science and distributed systems.",
    );
  });

  it("maps skills to a SkillsList block with hardSkills/softSkills", () => {
    const result = cvContentToPuckData(fullCvContent);
    const skillsBlock = result.content.find(
      (item) => item.type === "SkillsList",
    );

    expect(skillsBlock).toBeDefined();
    expect(skillsBlock?.props.hardSkills).toEqual(["TypeScript", "React"]);
    expect(skillsBlock?.props.softSkills).toEqual(["Mentoring"]);
  });

  it("maps interests to a dedicated SummaryBlock section", () => {
    const result = cvContentToPuckData(fullCvContent);
    const interestsBlock = result.content.find(
      (item) => item.type === "SummaryBlock" && item.props.id === "interests",
    );

    expect(interestsBlock?.props.summary).toBe("Trail running, photography");
    expect(
      result.content.some((item) => item.props.id === "divider-skills"),
    ).toBe(true);
  });

  it("does not insert a divider when skills follow the profile directly", () => {
    const result = cvContentToPuckData({
      ...minimalCvContent,
      candidate: {
        ...minimalCvContent.candidate,
        summary: "Product engineer",
      },
      skills: { hard: ["TypeScript"], soft: [] },
    });

    expect(
      result.content.some((item) => item.props.id === "divider-skills"),
    ).toBe(false);
  });

  it("maps certifications, languages, and projects correctly", () => {
    const result = cvContentToPuckData(fullCvContent);
    const types = result.content.map((item) => item.type);

    expect(types).toContain("CertificationItem");
    expect(types).toContain("LanguageItem");
    expect(types).toContain("ProjectItem");

    const certBlock = result.content.find(
      (item) => item.type === "CertificationItem",
    );
    expect(certBlock?.props.issuer).toBe("AWS");
  });

  it("inserts Divider and SectionTitle blocks between sections", () => {
    const result = cvContentToPuckData(fullCvContent);
    const types = result.content.map((item) => item.type);

    expect(types).toContain("Divider");
    expect(types).toContain("SectionTitle");

    const sectionLabels = result.content
      .filter((item) => item.type === "SectionTitle")
      .map((item) => item.props.label);

    expect(sectionLabels).toContain("Profil");
    expect(sectionLabels).toContain("Expériences");
    expect(sectionLabels).toContain("Formation");
    expect(sectionLabels).toContain("Compétences");
  });

  it("returns valid PuckData root", () => {
    const result = cvContentToPuckData(minimalCvContent);

    expect(result.root).toEqual({ props: {} });
    expect(Array.isArray(result.content)).toBe(true);
  });

  it("assigns stable unique ids to each block", () => {
    const result = cvContentToPuckData(fullCvContent);
    const ids = result.content.map((item) => item.props.id as string);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it("does not add optional sections when lists are empty", () => {
    const result = cvContentToPuckData(minimalCvContent);
    const types = result.content.map((item) => item.type);

    expect(types).not.toContain("ExperienceItem");
    expect(types).not.toContain("EducationItem");
    expect(types).not.toContain("SkillsList");
    expect(types).not.toContain("LanguageItem");
    expect(types).not.toContain("CertificationItem");
    expect(types).not.toContain("ProjectItem");
    expect(
      result.content.some((item) => item.props.id === "section-interests"),
    ).toBe(false);
  });
});
