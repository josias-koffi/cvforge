import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ProfilesStore, StoredProfile, StoredProfileRegistry } from "./profiles.types";

type PersistedProfilesState = {
  registries: Record<string, StoredProfileRegistry>;
};

function createEmptyState(): PersistedProfilesState {
  return { registries: {} };
}

function normalizeProfile(value: unknown): StoredProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;

  if (typeof raw.id !== "string" || !raw.id) {
    return null;
  }

  const identity =
    raw.identity && typeof raw.identity === "object"
      ? (raw.identity as Record<string, unknown>)
      : {};

  const sections =
    raw.sections && typeof raw.sections === "object"
      ? (raw.sections as Record<string, unknown>)
      : {};

  const meta =
    raw.meta && typeof raw.meta === "object"
      ? (raw.meta as Record<string, unknown>)
      : {};

  return {
    headline: typeof raw.headline === "string" ? raw.headline : "",
    id: raw.id,
    identity: {
      city: typeof identity.city === "string" ? identity.city : "",
      email: typeof identity.email === "string" ? identity.email : "",
      firstName: typeof identity.firstName === "string" ? identity.firstName : "",
      github: typeof identity.github === "string" ? identity.github : "",
      lastName: typeof identity.lastName === "string" ? identity.lastName : "",
      linkedIn: typeof identity.linkedIn === "string" ? identity.linkedIn : "",
      otherLink: typeof identity.otherLink === "string" ? identity.otherLink : "",
      phone: typeof identity.phone === "string" ? identity.phone : "",
      portfolio: typeof identity.portfolio === "string" ? identity.portfolio : "",
    },
    label: typeof raw.label === "string" ? raw.label : "Profil",
    meta: {
      lastSavedAt:
        typeof meta.lastSavedAt === "string" ? meta.lastSavedAt : null,
      maxProfiles:
        typeof meta.maxProfiles === "number" ? meta.maxProfiles : null,
      source:
        meta.source === "onboarding" || meta.source === "storage"
          ? meta.source
          : "storage",
    },
    sections: {
      certifications: Array.isArray(sections.certifications)
        ? (sections.certifications as StoredProfile["sections"]["certifications"])
        : [],
      education: Array.isArray(sections.education)
        ? (sections.education as StoredProfile["sections"]["education"])
        : [],
      experiences: Array.isArray(sections.experiences)
        ? (sections.experiences as StoredProfile["sections"]["experiences"])
        : [],
      interests: typeof sections.interests === "string" ? sections.interests : "",
      personalProjects: Array.isArray(sections.personalProjects)
        ? (sections.personalProjects as StoredProfile["sections"]["personalProjects"])
        : [],
      softSkills: Array.isArray(sections.softSkills)
        ? sections.softSkills.filter((s): s is string => typeof s === "string")
        : [],
      summary: typeof sections.summary === "string" ? sections.summary : "",
      technicalSkills: Array.isArray(sections.technicalSkills)
        ? sections.technicalSkills.filter((s): s is string => typeof s === "string")
        : [],
    },
  };
}

function normalizeRegistry(
  value: unknown,
  userEmail: string,
): StoredProfileRegistry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const profiles = Array.isArray(raw.profiles)
    ? raw.profiles.map(normalizeProfile).filter((p): p is StoredProfile => p !== null)
    : [];

  if (profiles.length === 0) {
    return null;
  }

  const activeProfileId =
    typeof raw.activeProfileId === "string" &&
    profiles.some((p) => p.id === raw.activeProfileId)
      ? raw.activeProfileId
      : profiles[0].id;

  return {
    activeProfileId,
    profiles,
    userEmail,
    version: 2,
  };
}

export class FileProfilesStore implements ProfilesStore {
  constructor(private readonly stateFilePath: string) {}

  save(userEmail: string, registry: StoredProfileRegistry): StoredProfileRegistry {
    const state = this.readState();
    const entry: StoredProfileRegistry = { ...registry, userEmail, version: 2 };
    state.registries[userEmail] = entry;
    this.writeState(state);
    return entry;
  }

  findByUserEmail(userEmail: string): StoredProfileRegistry | null {
    const state = this.readState();
    const raw = state.registries[userEmail];
    return raw ? normalizeRegistry(raw, userEmail) : null;
  }

  deleteByUserEmail(userEmail: string): number {
    const state = this.readState();
    const existed = userEmail in state.registries;
    delete state.registries[userEmail];

    if (existed) {
      this.writeState(state);
    }

    return existed ? 1 : 0;
  }

  private readState(): PersistedProfilesState {
    if (!existsSync(this.stateFilePath)) {
      return createEmptyState();
    }

    try {
      const parsed = JSON.parse(
        readFileSync(this.stateFilePath, "utf8"),
      ) as Partial<PersistedProfilesState>;

      return {
        registries:
          parsed.registries && typeof parsed.registries === "object"
            ? parsed.registries
            : {},
      };
    } catch {
      return createEmptyState();
    }
  }

  private writeState(state: PersistedProfilesState) {
    mkdirSync(dirname(this.stateFilePath), { recursive: true });
    writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
  }
}
