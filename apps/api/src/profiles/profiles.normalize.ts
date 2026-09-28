import type {
  ProfileContactLink,
  StoredProfile,
  StoredProfileRegistry,
} from "./profiles.types";

/**
 * The repairs the JSON store used to apply on every read. Legacy records on
 * disk are only valid because of them, and the Postgres columns are
 * `not null`, so `import-legacy-profiles` runs them before inserting.
 */
const AVAILABILITY_MODES = ["immediate", "date", ""];

/**
 * Records saved before the free-form links list existed stored a fixed set
 * of scalar fields; their non-empty values are ported in as labelled links
 * so nothing is lost on the first read after the migration.
 */
const LEGACY_LINK_FIELDS: Array<{ key: string; label: string }> = [
  { key: "linkedIn", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "portfolio", label: "Portfolio" },
  { key: "otherLink", label: "Autre" },
];

function normalizeContactLinks(
  identity: Record<string, unknown>,
): ProfileContactLink[] {
  if (Array.isArray(identity.links)) {
    return identity.links.filter(
      (link): link is ProfileContactLink =>
        Boolean(link) &&
        typeof link === "object" &&
        typeof (link as Record<string, unknown>).label === "string" &&
        typeof (link as Record<string, unknown>).url === "string",
    );
  }

  return LEGACY_LINK_FIELDS.filter(
    ({ key }) => typeof identity[key] === "string" && (identity[key] as string).trim(),
  ).map(({ key, label }) => ({ label, url: (identity[key] as string).trim() }));
}

function normalizePreferences(value: unknown): StoredProfile["preferences"] {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    availabilityDate:
      typeof raw.availabilityDate === "string" ? raw.availabilityDate : "",
    availabilityMode:
      typeof raw.availabilityMode === "string" &&
      AVAILABILITY_MODES.includes(raw.availabilityMode)
        ? (raw.availabilityMode as StoredProfile["preferences"]["availabilityMode"])
        : "",
    contractTypes: typeof raw.contractTypes === "string" ? raw.contractTypes : "",
  };
}

export function normalizeProfile(value: unknown): StoredProfile | null {
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
      lastName: typeof identity.lastName === "string" ? identity.lastName : "",
      links: normalizeContactLinks(identity),
      phone: typeof identity.phone === "string" ? identity.phone : "",
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
    preferences: normalizePreferences(raw.preferences),
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
      languages: Array.isArray(sections.languages)
        ? (sections.languages as StoredProfile["sections"]["languages"])
        : [],
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

export function normalizeRegistry(
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
