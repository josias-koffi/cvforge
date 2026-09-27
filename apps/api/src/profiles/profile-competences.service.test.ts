import { Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RomeoClient, RomeoCompetence } from "../rome/romeo.client";
import {
  competenceTexts,
  textsFingerprint,
} from "./profile-competences.inference";
import type { ProfileCompetencesStore } from "./profile-competences.pg-store";
import { ProfileCompetencesService } from "./profile-competences.service";
import { ProfilesService } from "./profiles.service";
import type { ProfilesStore, StoredProfile } from "./profiles.types";

function profile(id: string, technicalSkills: string[]): StoredProfile {
  return {
    headline: "",
    id,
    identity: {} as StoredProfile["identity"],
    label: id,
    meta: { lastSavedAt: null, maxProfiles: null, source: "storage" },
    preferences: {
      availabilityDate: "",
      availabilityMode: "",
      contractTypes: "",
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
      technicalSkills,
    },
  };
}

const DOCKER: RomeoCompetence = {
  code: "D1",
  libelle: "Docker",
  score: 1,
  textIndex: 0,
  type: "SAVOIR",
};
const DOCTORATE: RomeoCompetence = {
  code: "D2",
  libelle: "Doctorat",
  score: 0.83,
  textIndex: 0,
  type: "SAVOIR",
};

function createService(options: {
  fingerprint?: string | null;
  predictions?: RomeoCompetence[] | null;
  dismissed?: string[];
}) {
  const store = {
    dismiss: vi.fn(async () => true),
    dismissedCodes: vi.fn(async () => new Set(options.dismissed ?? [])),
    fingerprint: vi.fn(async () => options.fingerprint ?? null),
    forgetOtherProfiles: vi.fn(async () => undefined),
    list: vi.fn(async () => []),
    replaceInferred: vi.fn(async () => undefined),
  };
  const romeo = {
    predictCompetences: vi.fn(async () =>
      options.predictions === undefined ? [DOCKER] : options.predictions,
    ),
  };

  return {
    romeo,
    service: new ProfileCompetencesService(
      store as unknown as ProfileCompetencesStore,
      romeo as unknown as RomeoClient,
    ),
    store,
  };
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("ProfileCompetencesService.refresh", () => {
  it("reads a changed CV and stores what is kept, with its fingerprint", async () => {
    const { romeo, service, store } = createService({
      dismissed: [DOCTORATE.code],
      predictions: [DOCKER, DOCTORATE],
    });
    const cv = profile("p1", ["Docker"]);

    await service.refresh("ana@x.fr", [cv]);

    expect(store.forgetOtherProfiles).toHaveBeenCalledWith("ana@x.fr", ["p1"]);
    expect(romeo.predictCompetences).toHaveBeenCalledWith(["Docker"]);
    expect(store.replaceInferred).toHaveBeenCalledWith(
      "ana@x.fr",
      "p1",
      textsFingerprint(competenceTexts(cv)),
      [{ code: "D1", libelle: "Docker", score: 1, type: "SAVOIR" }],
    );
  });

  it("does not call ROMEO again while the texts are unchanged", async () => {
    const cv = profile("p1", ["Docker"]);
    const { romeo, service, store } = createService({
      fingerprint: textsFingerprint(competenceTexts(cv)),
    });

    await service.refresh("ana@x.fr", [cv]);

    expect(romeo.predictCompetences).not.toHaveBeenCalled();
    expect(store.replaceInferred).not.toHaveBeenCalled();
  });

  it("records nothing when ROMEO cannot answer, so the next save retries", async () => {
    const { service, store } = createService({ predictions: null });

    await service.refresh("ana@x.fr", [profile("p1", ["Docker"])]);

    expect(store.replaceInferred).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("ROMEO unavailable"),
    );
  });

  it("never throws: the profiles are already saved", async () => {
    const { romeo, service } = createService({});
    romeo.predictCompetences.mockRejectedValueOnce(new Error("socket hang up"));

    await expect(
      service.refresh("ana@x.fr", [profile("p1", ["Docker"])]),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("socket hang up"),
    );
  });
});

describe("ProfileCompetencesService decisions", () => {
  it("removes a competence, then answers the new list", async () => {
    const { service, store } = createService({});

    await service.dismiss("ana@x.fr", "p1", "D2");

    expect(store.dismiss).toHaveBeenCalledWith("ana@x.fr", "p1", "D2");
    expect(store.list).toHaveBeenCalledWith("ana@x.fr", "p1");
  });
});

describe("ProfilesService", () => {
  it("reads the competences once the registry is saved", async () => {
    const cv = profile("p1", ["Docker"]);
    const registry = {
      activeProfileId: "p1",
      profiles: [cv],
      userEmail: "ana@x.fr",
      version: 2 as const,
    };
    const store = {
      findByUserEmail: vi.fn(async () => registry),
      save: vi.fn(async () => registry),
    };
    const competences = { refresh: vi.fn(async () => undefined) };
    const service = new ProfilesService(
      store as unknown as ProfilesStore,
      competences as unknown as ProfileCompetencesService,
    );

    await service.saveRegistry("ana@x.fr", registry);

    expect(competences.refresh).toHaveBeenCalledWith("ana@x.fr", [cv]);
    expect(await service.findProfile("ana@x.fr", "p1")).toBe(cv);
    expect(await service.findProfile("ana@x.fr", "p9")).toBeNull();
  });
});
