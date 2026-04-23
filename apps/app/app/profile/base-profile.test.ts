import { describe, expect, it, vi } from "vitest";
import { ONBOARDING_DRAFT_STORAGE_KEY, createEmptyDraft } from "../onboarding/draft";
import {
  APPLICATION_PROFILE_SELECTION_STORAGE_KEY,
  BASE_PROFILE_REGISTRY_STORAGE_KEY,
  BASE_PROFILE_STORAGE_KEY,
  applyImportedCvProfilePatch,
  countCompletedProfileSections,
  createEmptyCertification,
  createAdditionalBaseProfile,
  createEmptyBaseProfile,
  createEmptyEducation,
  createEmptyExperience,
  createEmptyProject,
  formatProfileSavedAt,
  getProfileForApplication,
  getSelectedProfileIdForApplication,
  joinListInput,
  loadApplicationProfileSelection,
  loadBaseProfileFromStorage,
  loadProfileRegistryFromStorage,
  saveApplicationProfileSelection,
  saveBaseProfileToStorage,
  sanitizeBaseProfile,
  splitListInput,
  touchBaseProfile,
} from "./base-profile";

describe("base profile helpers", () => {
  it("creates an empty profile with an id for the authenticated user", () => {
    const profile = createEmptyBaseProfile("user@example.com");

    expect(profile.id).toBeTruthy();
    expect(profile.identity.email).toBe("user@example.com");
    expect(profile.meta.maxProfiles).toBeNull();
    expect(profile.sections.experiences).toEqual([]);
  });

  it("creates additional profiles with distinct labels", () => {
    const profile = createAdditionalBaseProfile("user@example.com", 1);

    expect(profile.label).toBe("Profil 2");
    expect(profile.id).toBeTruthy();
  });

  it("applies imported CV data without overwriting local sensitive fields", () => {
    const profile = createEmptyBaseProfile("user@example.com");
    profile.identity.lastName = "Dupont";
    profile.identity.phone = "+33612345678";

    const imported = applyImportedCvProfilePatch(profile, {
      headline: "Senior Developer",
      identity: {
        city: "Paris",
        firstName: "Jean",
        github: "",
        linkedIn: "https://linkedin.com/in/jean",
        portfolio: "",
      },
      sections: {
        certifications: [],
        education: [],
        experiences: [
          {
            company: "Acme",
            period: "2020-2024",
            results: "Built APIs",
            role: "Backend Developer",
          },
        ],
        interests: "",
        personalProjects: [],
        softSkills: ["Communication"],
        summary: "Experienced backend developer",
        technicalSkills: ["TypeScript"],
      },
    });

    expect(imported.headline).toBe("Senior Developer");
    expect(imported.identity.firstName).toBe("Jean");
    expect(imported.identity.lastName).toBe("Dupont");
    expect(imported.identity.phone).toBe("+33612345678");
    expect(imported.sections.technicalSkills).toEqual(["TypeScript"]);
    expect(imported.sections.experiences[0]?.role).toBe("Backend Developer");
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
      setItem: vi.fn(),
    };

    const profile = loadBaseProfileFromStorage("seed@example.com", storage);

    expect(profile.identity.firstName).toBe("Jane");
    expect(profile.identity.linkedIn).toContain("linkedin.com");
    expect(profile.sections.summary).toContain("ancien CV");
    expect(profile.meta.source).toBe("onboarding");
  });

  it("migrates the legacy single-profile storage into the registry", () => {
    const legacyProfile = {
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
    };
    let savedRegistry = "";
    const storage = {
      getItem: (key: string) =>
        key === BASE_PROFILE_STORAGE_KEY ? JSON.stringify(legacyProfile) : null,
      setItem: (key: string, value: string) => {
        if (key === BASE_PROFILE_REGISTRY_STORAGE_KEY) {
          savedRegistry = value;
        }
      },
    };

    const registry = loadProfileRegistryFromStorage("stored@example.com", storage);

    expect(registry.profiles).toHaveLength(1);
    expect(registry.profiles[0]?.headline).toBe("Product designer");
    expect(registry.profiles[0]?.meta.source).toBe("storage");
    expect(savedRegistry).toContain("Product designer");
  });

  it("reads the active profile from the persisted registry", () => {
    const firstProfile = createEmptyBaseProfile("stored@example.com", {
      id: "profile-1",
      label: "Principal",
    });
    const secondProfile = createEmptyBaseProfile("stored@example.com", {
      id: "profile-2",
      label: "Freelance",
    });
    secondProfile.headline = "Product designer";
    secondProfile.sections.experiences = [
      { company: "CVforge", period: "2026", results: "Growth", role: "Lead" },
    ];
    const storage = {
      getItem: (key: string) =>
        key === BASE_PROFILE_REGISTRY_STORAGE_KEY
          ? JSON.stringify({
              activeProfileId: "profile-2",
              profiles: [firstProfile, secondProfile],
              version: 2,
            })
          : null,
      setItem: vi.fn(),
    };

    const profile = loadBaseProfileFromStorage("stored@example.com", storage);

    expect(profile.id).toBe("profile-2");
    expect(profile.label).toBe("Freelance");
    expect(profile.sections.experiences).toHaveLength(1);
  });

  it("persists the serialized profile in the registry when storage is available", () => {
    let writtenRegistry = "";
    let writtenLegacyValue = "";
    const storage = {
      getItem: () => null,
      setItem: (key: string, value: string) => {
        if (key === BASE_PROFILE_REGISTRY_STORAGE_KEY) {
          writtenRegistry = value;
        }

        if (key === BASE_PROFILE_STORAGE_KEY) {
          writtenLegacyValue = value;
        }
      },
    };

    const profile = createEmptyBaseProfile("writer@example.com", {
      id: "profile-writer",
      label: "Writer",
    });

    saveBaseProfileToStorage(profile, storage);

    expect(writtenRegistry).toContain("profile-writer");
    expect(writtenLegacyValue).toContain("writer@example.com");
  });

  it("returns empty defaults when storage is unavailable or invalid", () => {
    const emptyWithoutStorage = loadBaseProfileFromStorage("user@example.com", undefined);
    const emptyWithInvalidStorage = loadBaseProfileFromStorage("user@example.com", {
      getItem: (key: string) =>
        key === BASE_PROFILE_REGISTRY_STORAGE_KEY ? "{bad-json" : null,
      setItem: vi.fn(),
    });

    expect(emptyWithoutStorage.meta.source).toBe("empty");
    expect(emptyWithInvalidStorage.identity.email).toBe("user@example.com");
  });

  it("does not seed another profile when onboarding is still empty", () => {
    const emptyOnboardingDraft = createEmptyDraft("blank@example.com");
    const storage = {
      getItem: (key: string) =>
        key === ONBOARDING_DRAFT_STORAGE_KEY ? JSON.stringify(emptyOnboardingDraft) : null,
      setItem: vi.fn(),
    };

    const profile = loadBaseProfileFromStorage("blank@example.com", storage);

    expect(profile.meta.source).toBe("empty");
    expect(profile.identity.firstName).toBe("");
  });

  it("sanitizes malformed persisted data and keeps the multi-profile shape safe", () => {
    const profile = sanitizeBaseProfile(
      {
        id: 42,
        identity: {
          email: 12,
          firstName: "Jane",
        },
        label: ["bad"],
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

    expect(profile.id).toBeTruthy();
    expect(profile.identity.email).toBe("fallback@example.com");
    expect(profile.meta.lastSavedAt).toBeNull();
    expect(profile.meta.maxProfiles).toBeNull();
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

  it("stores and resolves per-application profile selections", () => {
    let writtenSelection = "";
    const storage = {
      getItem: (key: string) =>
        key === APPLICATION_PROFILE_SELECTION_STORAGE_KEY
          ? JSON.stringify({ app_123: "profile-2" })
          : null,
      setItem: (key: string, value: string) => {
        if (key === APPLICATION_PROFILE_SELECTION_STORAGE_KEY) {
          writtenSelection = value;
        }
      },
    };
    const firstProfile = createEmptyBaseProfile("user@example.com", {
      id: "profile-1",
      label: "Principal",
    });
    const secondProfile = createEmptyBaseProfile("user@example.com", {
      id: "profile-2",
      label: "Freelance",
    });
    const registry = {
      activeProfileId: "profile-1",
      profiles: [firstProfile, secondProfile],
      version: 2 as const,
    };

    expect(loadApplicationProfileSelection(storage)).toEqual({ app_123: "profile-2" });
    expect(
      getSelectedProfileIdForApplication("app_123", registry, {
        app_123: "profile-2",
      }),
    ).toBe("profile-2");
    expect(
      getProfileForApplication("app_123", registry, { app_123: "profile-2" })?.label,
    ).toBe("Freelance");

    saveApplicationProfileSelection({ app_123: "profile-1" }, storage);

    expect(writtenSelection).toContain("profile-1");
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
