import {
  DEFAULT_SEARCH_RADIUS_KM,
  emptySearchProject,
  type SearchProject,
} from "@cvforge/types";
import type { StoredProfile } from "../profiles/profiles.types";
import { parseLegacyContractTypes } from "./search-projects.normalize";

/**
 * A first draft of the search project, read from the profile itself.
 *
 * The candidate confirms it in the "Ma recherche" tab — this only spares them
 * the empty form. Nothing is inferred beyond what the profile literally says:
 * a wrong guess here silently filters offers out, which is worse than a blank
 * field.
 */
export function prefillSearchProject(profile: StoredProfile): SearchProject {
  const base = emptySearchProject(profile.id);
  const city = profile.identity.city.trim();

  return {
    ...base,
    contractTypes: parseLegacyContractTypes(profile.preferences.contractTypes),
    locations: city
      ? [
          {
            department: "",
            inseeCode: "",
            label: city,
            latitude: null,
            longitude: null,
            radiusKm: DEFAULT_SEARCH_RADIUS_KM,
          },
        ]
      : [],
    targetRoles: targetRoles(profile),
  };
}

/**
 * The headline first — it is the one line the candidate wrote about the job
 * they want — then the most recent role held, which is often the same job
 * spelled the way employers write it.
 */
function targetRoles(profile: StoredProfile): string[] {
  const candidates = [
    profile.headline,
    profile.sections.experiences[0]?.role ?? "",
  ];

  const roles: string[] = [];
  for (const candidate of candidates) {
    const trimmed = candidate.trim().slice(0, 120);
    if (!trimmed) continue;
    if (roles.some((role) => role.toLowerCase() === trimmed.toLowerCase())) {
      continue;
    }
    roles.push(trimmed);
  }

  return roles;
}
