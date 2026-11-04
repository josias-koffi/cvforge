import type { CVDocumentContent } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import { normalizeUpdatedCvContent } from "./cv-generation.normalizers";
import { mergeTranslatedCv } from "./cv-generation.translation";

const experience = (overrides: Record<string, unknown>) => ({
  achievements: [],
  company: "ACME",
  description: "",
  endDate: "",
  position: "Dev",
  startDate: "",
  ...overrides,
});

const base: CVDocumentContent = {
  candidate: {
    city: "",
    drivingLicenses: [],
    email: "",
    firstName: "A",
    lastName: "B",
    links: [],
    phone: "",
    summary: "",
    title: "",
  },
  certifications: [],
  education: [],
  experiences: [],
  interests: "",
  languages: [],
  projects: [],
  skills: { hard: [], soft: [] },
};

describe("manual CV save", () => {
  it("keeps the order chosen by the user instead of re-sorting by recency", () => {
    const saved = normalizeUpdatedCvContent({
      ...base,
      experiences: [
        experience({ company: "Old", endDate: "2015", startDate: "2012" }),
        experience({ company: "Recent", endDate: "Présent", startDate: "2020" }),
      ],
    });

    expect(saved.experiences.map((item) => item.company)).toEqual(["Old", "Recent"]);
  });

  it("leaves legacy free text untouched when no structured date is set", () => {
    const saved = normalizeUpdatedCvContent({
      ...base,
      education: [
        { degree: "M2", description: "", institution: "X", mention: "", year: "Printemps 2020" },
      ],
      experiences: [experience({ endDate: "Hiver 2021", startDate: "Été 2019" })],
    });

    expect(saved.education[0]).not.toHaveProperty("date");
    expect(saved.education[0].year).toBe("Printemps 2020");
    expect(saved.experiences[0]).toMatchObject({ endDate: "Hiver 2021", startDate: "Été 2019" });
    expect(saved.experiences[0]).not.toHaveProperty("start");
  });

  it("keeps structured dates and rewrites the legacy text in the CV language", () => {
    const content = {
      ...base,
      certifications: [{ date: "2022-03-15", issuer: "AWS", title: "SAA", year: "old" }],
      experiences: [experience({ current: true, start: "2021-03" })],
    };

    const french = normalizeUpdatedCvContent(content);
    expect(french.experiences[0]).toMatchObject({
      current: true,
      endDate: "Présent",
      start: "2021-03",
      startDate: "mars 2021",
    });
    expect(french.certifications[0]).toMatchObject({ date: "2022-03-15", year: "15/03/2022" });

    const english = normalizeUpdatedCvContent({ ...content, language: "en" });
    expect(english.experiences[0]).toMatchObject({ endDate: "Present", startDate: "Mar 2021" });
    expect(english.certifications[0].year).toBe("Mar 15, 2022");
  });

  it("drops invalid structured values", () => {
    const saved = normalizeUpdatedCvContent({
      ...base,
      experiences: [experience({ endDate: "2020", start: "n'importe quoi", startDate: "2018" })],
    });

    expect(saved.experiences[0]).toMatchObject({ endDate: "2020", startDate: "2018" });
    expect(saved.experiences[0]).not.toHaveProperty("start");
  });
});

describe("translation", () => {
  it("re-renders structured dates in the target language, whatever the model returned", () => {
    const original: CVDocumentContent = {
      ...base,
      experiences: [
        experience({ current: true, endDate: "Présent", start: "2021-03", startDate: "mars 2021" }),
      ],
    } as CVDocumentContent;

    const translated = mergeTranslatedCv(
      original,
      { experiences: [experience({ endDate: "Currently", startDate: "March of 2021" })] },
      "en",
    );

    expect(translated.experiences[0]).toMatchObject({
      endDate: "Present",
      start: "2021-03",
      startDate: "Mar 2021",
    });
  });
});
