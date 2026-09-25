import { cleanLines } from "@/components/documents/list-editor"
import type { BaseProfile } from "@/lib/profile-model"

/** The skills as saved: one per line, no blank ones. */
export function normalizeProfile(profile: BaseProfile): BaseProfile {
  return {
    ...profile,
    sections: {
      ...profile.sections,
      softSkills: cleanLines(profile.sections.softSkills),
      technicalSkills: cleanLines(profile.sections.technicalSkills),
    },
  }
}
