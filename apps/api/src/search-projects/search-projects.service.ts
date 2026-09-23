import { Injectable, NotFoundException } from "@nestjs/common";
import { emptySearchProject, type SearchProject } from "@cvforge/types";
import type { ProfilesStore, StoredProfile } from "../profiles/profiles.types";
import { normalizeSearchProject } from "./search-projects.normalize";
import { prefillSearchProject } from "./search-projects.prefill";
import type { SearchProjectsStore } from "./search-projects.types";

@Injectable()
export class SearchProjectsService {
  constructor(
    private readonly store: SearchProjectsStore,
    private readonly profiles: ProfilesStore,
  ) {}

  /**
   * The saved project, or an empty one for a profile that has none yet. The
   * empty project is not written: a candidate who never opened the tab has no
   * search, and the morning digest must not pick them up.
   */
  async get(userEmail: string, profileId: string): Promise<SearchProject> {
    await this.assertProfile(userEmail, profileId);

    return (
      (await this.store.findByProfileId(userEmail, profileId)) ??
      emptySearchProject(profileId)
    );
  }

  async save(
    userEmail: string,
    profileId: string,
    raw: unknown,
  ): Promise<SearchProject> {
    await this.assertProfile(userEmail, profileId);

    return this.store.save(userEmail, normalizeSearchProject(profileId, raw));
  }

  /**
   * A draft read from the profile, returned but **not** saved: the candidate
   * reviews it in the form and saves it themselves.
   */
  async prefill(userEmail: string, profileId: string): Promise<SearchProject> {
    const profile = await this.assertProfile(userEmail, profileId);

    return prefillSearchProject(profile);
  }

  private async assertProfile(
    userEmail: string,
    profileId: string,
  ): Promise<StoredProfile> {
    const registry = await this.profiles.findByUserEmail(userEmail);
    const profile = registry?.profiles.find((entry) => entry.id === profileId);

    if (!profile) {
      throw new NotFoundException("Ce profil est introuvable.");
    }

    return profile;
  }
}
