import { emptySearchProject, type SearchProject } from "@cvforge/types";
import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type {
  ProfilesStore,
  StoredProfile,
  StoredProfileRegistry,
} from "../profiles/profiles.types";
import { SearchProjectsService } from "./search-projects.service";
import type { SearchProjectsStore } from "./search-projects.types";

function makeProfile(id: string): StoredProfile {
  return {
    headline: "Développeuse Full Stack",
    id,
    identity: {
      city: "Nantes",
      email: "jane@example.com",
      firstName: "Jane",
      github: "",
      lastName: "Doe",
      linkedIn: "",
      otherLink: "",
      phone: "",
      portfolio: "",
    },
    label: `Profil ${id}`,
    meta: { lastSavedAt: null, maxProfiles: 3, source: "storage" },
    preferences: {
      availabilityDate: "",
      availabilityMode: "immediate",
      contractTypes: "Alternance",
    },
    sections: {
      certifications: [],
      education: [],
      experiences: [],
      interests: "",
      languages: [],
      personalProjects: [],
      softSkills: [],
      summary: "",
      technicalSkills: [],
    },
  };
}

function createService(profileIds = ["profile-1"]) {
  const saved: SearchProject[] = [];
  const store: SearchProjectsStore = {
    deleteByUserEmail: async () => 0,
    findByProfileId: async (_userEmail, profileId) =>
      saved.find((project) => project.profileId === profileId) ?? null,
    listByUserEmail: async () => saved,
    listAll: async () => [],
    listDigestEnabled: async () =>
      saved
        .filter((project) => project.digestEnabled)
        .map((project) => ({ project, userEmail: "user@example.com" })),
    save: async (_userEmail, project) => {
      saved.push(project);
      return project;
    },
  };
  const registry: StoredProfileRegistry = {
    activeProfileId: profileIds[0] ?? "",
    profiles: profileIds.map(makeProfile),
    userEmail: "user@example.com",
    version: 2,
  };
  const profiles: ProfilesStore = {
    deleteByUserEmail: async () => 0,
    findByUserEmail: async (userEmail) =>
      userEmail === "user@example.com" ? registry : null,
    save: async (_userEmail, value) => value,
  };

  return { saved, service: new SearchProjectsService(store, profiles) };
}

describe("SearchProjectsService", () => {
  it("returns an unsaved empty project for a profile that has none", async () => {
    const { saved, service } = createService();

    expect(await service.get("user@example.com", "profile-1")).toEqual(
      emptySearchProject("profile-1"),
    );
    expect(saved).toEqual([]);
  });

  it("refuses a profile that belongs to somebody else", async () => {
    const { service } = createService();

    await expect(
      service.get("intruder@example.com", "profile-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.save("user@example.com", "profile-unknown", {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("normalizes what it saves", async () => {
    const { service } = createService();

    const project = await service.save("user@example.com", "profile-1", {
      contractTypes: ["cdi", "not-a-contract"],
      digestEnabled: true,
      targetRoles: ["Développeuse Full Stack"],
    });

    expect(project.contractTypes).toEqual(["cdi"]);
    expect(project.digestEnabled).toBe(true);
  });

  it("prefills from the profile without saving", async () => {
    const { saved, service } = createService();

    const project = await service.prefill("user@example.com", "profile-1");

    expect(project.contractTypes).toEqual(["alternance"]);
    expect(project.targetRoles).toEqual(["Développeuse Full Stack"]);
    expect(saved).toEqual([]);
  });
});
