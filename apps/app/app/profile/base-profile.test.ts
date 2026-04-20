import { describe, expect, it, vi } from "vitest";
import { ONBOARDING_DRAFT_STORAGE_KEY, createEmptyDraft } from "../onboarding/draft";
import {
  BASE_PROFILE_STORAGE_KEY,
  countCompletedProfileSections,
  createEmptyCertification,
  createEmptyBaseProfile,
  createEmptyEducation,
  createEmptyExperience,
  createEmptyProject,
  formatProfileSavedAt,
  joinListInput,
  loadBaseProfileFromStorage,
  saveBaseProfileToStorage,
  sanitizeBaseProfile,
  splitListInput,
  touchBaseProfile,
} from "./base-profile";

describe("base profile helpers", () => {
  it("creates a single empty profile for the authenticated user", () => {
    const profile = createEmptyBaseProfile("user@example.com");

    expect(profile.identity.email).toBe("user@example.com");
    expect(profile.meta.maxProfiles).toBe(1);
    expect(profile.sections.experiences).toEqual([]);
  });

  it("seeds the base profile from onboarding when no saved profile exists", () => {
    const onboardingDraft = createEmptyDraft("seed@example.com");
    onboardingDraft.personal.firstName = "Jane";
    onboardingDraft.personal.lastName = "Doe";
    onboardingDraft.personal.city = "Paris";
    onboardingDraft.links.linkedIn = "https://linkedin.com/in/jane";
    onboardingDraft.importCv.notes = "Resume depuis l'ancien CV.";

    const storage = {
      getItem: (key: string) =>
        key === ONBOARDING_DRAFT_STORAGE_KEY ? JSON.stringify(onboardingDraft) : null,
    };

    const profile = loadBaseProfileFromStorage("seed@example.com", storage);

    expect(profile.identity.firstName).toBe("Jane");
    expect(profile.identity.linkedIn).toContain("linkedin.com");
    expect(profile.sections.summary).toContain("ancien CV");
    expect(profile.meta.source).toBe("onboarding");
  });

  it("reads the persisted profile instead of creating another one", () => {
    const storage = {
      getItem: (key: string) =>
        key === BASE_PROFILE_STORAGE_KEY
          ? JSON.stringify({
              headline: "Product designer",
              identity: {
                email: "stored@example.com",
                firstName: "Stored",
              },
              meta: {
                lastSavedAt: "2026-04-20T09:00:00.000Z",
                source: "storage",
              },
              sections: {
                experiences: [{ company: "CVforge", period: "2026", results: "Growth", role: "Lead" }],
                technicalSkills: ["Figma", "UX writing"],
              },
            })
          : null,
    };

    const profile = loadBaseProfileFromStorage("stored@example.com", storage);

    expect(profile.headline).toBe("Product designer");
    expect(profile.sections.experiences).toHaveLength(1);
    expect(profile.meta.maxProfiles).toBe(1);
    expect(profile.meta.source).toBe("storage");
  });

  it("persists the serialized profile when storage is available", () => {
    let writtenKey = "";
    let writtenValue = "";
    const storage = {
      setItem: (key: string, value: string) => {
        writtenKey = key;
        writtenValue = value;
      },
    };

    saveBaseProfileToStorage(createEmptyBaseProfile("writer@example.com"), storage);

    expect(writtenKey).toBe(BASE_PROFILE_STORAGE_KEY);
    expect(writtenValue).toContain("writer@example.com");
  });

  it("returns empty defaults when storage is unavailable or invalid", () => {
    const emptyWithoutStorage = loadBaseProfileFromStorage("user@example.com", undefined);
    const emptyWithInvalidStorage = loadBaseProfileFromStorage("user@example.com", {
      getItem: (key: string) => (key === BASE_PROFILE_STORAGE_KEY ? "{bad-json" : null),
    });

    expect(emptyWithoutStorage.meta.source).toBe("empty");
    expect(emptyWithInvalidStorage.identity.email).toBe("user@example.com");
  });

  it("does not seed another profile when onboarding is still empty", () => {
    const emptyOnboardingDraft = createEmptyDraft("blank@example.com");
    const storage = {
      getItem: (key: string) =>
        key === ONBOARDING_DRAFT_STORAGE_KEY ? JSON.stringify(emptyOnboardingDraft) : null,
    };

    const profile = loadBaseProfileFromStorage("blank@example.com", storage);

    expect(profile.meta.source).toBe("empty");
    expect(profile.identity.firstName).toBe("");
  });

  it("sanitizes malformed persisted data and keeps the single-profile rule", () => {
    const profile = sanitizeBaseProfile(
      {
        identity: {
          email: 12,
          firstName: "Jane",
        },
        meta: {
          lastSavedAt: 24,
          maxProfiles: 4,
          source: "unsupported",
        },
        sections: {
          certifications: [{ issuer: "RNCP", title: "Certif", year: 2026 }],
          education: [{ degree: "Master", honors: true, institution: "Paris", year: 2025 }],
          experiences: [{ company: "CVforge", period: "2026", results: null, role: "Engineer" }],
          interests: ["running"],
          personalProjects: [{ description: "App", link: null, title: "Portfolio" }],
          softSkills: ["Communication", 12],
          summary: ["bad"],
          technicalSkills: ["TypeScript", false],
        },
      },
      "fallback@example.com",
    );

    expect(profile.identity.email).toBe("fallback@example.com");
    expect(profile.meta.lastSavedAt).toBeNull();
    expect(profile.meta.maxProfiles).toBe(1);
    expect(profile.meta.source).toBe("empty");
    expect(profile.sections.certifications[0]?.year).toBe("");
    expect(profile.sections.softSkills).toEqual(["Communication"]);
    expect(profile.sections.technicalSkills).toEqual(["TypeScript"]);
  });

  it("tracks profile saves and completed vision sections", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T09:30:00.000Z"));

    const profile = touchBaseProfile({
      ...createEmptyBaseProfile("user@example.com"),
      headline: "Developpeuse full-stack",
      sections: {
        certifications: [],
        education: [{ degree: "Master", honors: "", institution: "Paris", year: "2025" }],
        experiences: [{ company: "CVforge", period: "2026", results: "120% pipeline", role: "Engineer" }],
        interests: "Course a pied",
        personalProjects: [],
        softSkills: ["Ecoute"],
        summary: "Je construis des produits candidats.",
        technicalSkills: ["TypeScript"],
      },
    });

    expect(profile.meta.lastSavedAt).toBe("2026-04-20T09:30:00.000Z");
    expect(countCompletedProfileSections(profile)).toBe(7);
    expect(formatProfileSavedAt(profile.meta.lastSavedAt)).toContain("Profil enregistre le");

    vi.useRealTimers();
  });

  it("normalizes comma-separated skill input", () => {
    expect(splitListInput("TypeScript, UX,  React ")).toEqual(["TypeScript", "UX", "React"]);
    expect(joinListInput(["Node.js", "NestJS"])).toBe("Node.js, NestJS");
  });

  it("covers the empty-entry factories and save-format fallbacks", () => {
    expect(createEmptyExperience()).toEqual({
      company: "",
      period: "",
      results: "",
      role: "",
    });
    expect(createEmptyEducation()).toEqual({
      degree: "",
      honors: "",
      institution: "",
      year: "",
    });
    expect(createEmptyCertification()).toEqual({
      issuer: "",
      title: "",
      year: "",
    });
    expect(createEmptyProject()).toEqual({
      description: "",
      link: "",
      title: "",
    });
    expect(formatProfileSavedAt(null)).toBe("Aucune sauvegarde locale pour le profil.");
    expect(formatProfileSavedAt("bad-date")).toBe("Profil enregistre localement.");
    expect(() =>
      saveBaseProfileToStorage(createEmptyBaseProfile("skip@example.com"), undefined),
    ).not.toThrow();
  });
});
