import { emptySearchProject, type SearchProject } from "@cvforge/types";
import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type {
  ProfilesStore,
  StoredProfile,
  StoredProfileRegistry,
} from "../profiles/profiles.types";
import type { SearchProjectRomeService } from "./search-project-rome.service";
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
    findRomeCodes: async () => [],
    listByUserEmail: async () => saved,
    listAll: async () => [],
    listDigestEnabled: async () =>
      saved
        .filter((project) => project.digestEnabled)
        .map((project) => ({
          project,
          romeCodes: [],
          userEmail: "user@example.com",
        })),
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

  const rome = {
    confirm: vi.fn(async () => []),
    dismiss: vi.fn(async () => []),
    list: vi.fn(async () => []),
    suggest: vi.fn(async () => undefined),
  };

  return {
    rome,
    saved,
    service: new SearchProjectsService(
      store,
      profiles,
      rome as unknown as SearchProjectRomeService,
    ),
  };
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

  it("asks for ROME suggestions after saving, from the roles and the CV headline", async () => {
    const { rome, saved, service } = createService();

    await service.save("user@example.com", "profile-1", {
      targetRoles: ["Développeur web", "Intégrateur"],
    });

    expect(saved).toHaveLength(1);
    expect(rome.suggest).toHaveBeenCalledWith("user@example.com", "profile-1", [
      "Développeur web",
      "Intégrateur",
      "Développeuse Full Stack",
    ]);
  });

  it("checks the profile before any ROME read or decision", async () => {
    const { rome, service } = createService();

    await service.listRome("user@example.com", "profile-1");
    await service.confirmRome("user@example.com", "profile-1", "38976");
    await service.dismissRome("user@example.com", "profile-1", "38976");

    expect(rome.list).toHaveBeenCalledWith("user@example.com", "profile-1");
    expect(rome.confirm).toHaveBeenCalledWith(
      "user@example.com",
      "profile-1",
      "38976",
    );
    expect(rome.dismiss).toHaveBeenCalledWith(
      "user@example.com",
      "profile-1",
      "38976",
    );

    for (const call of [
      () => service.listRome("intruder@example.com", "profile-1"),
      () => service.confirmRome("user@example.com", "profile-2", "38976"),
      () => service.dismissRome("user@example.com", "profile-2", "38976"),
    ]) {
      await expect(call()).rejects.toBeInstanceOf(NotFoundException);
    }
    expect(rome.confirm).toHaveBeenCalledTimes(1);
  });
});
