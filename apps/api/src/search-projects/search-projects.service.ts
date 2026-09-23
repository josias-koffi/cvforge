import { Injectable, NotFoundException } from "@nestjs/common";
import { emptySearchProject, type SearchProject } from "@cvforge/types";
import type { ProfilesStore, StoredProfile } from "../profiles/profiles.types";
import type { SearchProjectRomeService } from "./search-project-rome.service";
import { normalizeSearchProject } from "./search-projects.normalize";
import { prefillSearchProject } from "./search-projects.prefill";
import type { SearchProjectsStore } from "./search-projects.types";

@Injectable()
export class SearchProjectsService {
  constructor(
    private readonly store: SearchProjectsStore,
    private readonly profiles: ProfilesStore,
    private readonly rome: SearchProjectRomeService,
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

  /**
   * Saving is the one moment ROMEO is asked what the candidate's words mean
   * (ADR-024): from the titles they target and the headline of their CV. The
   * project is stored first, so a ROMEO failure never costs the save.
   */
  async save(
    userEmail: string,
    profileId: string,
    raw: unknown,
  ): Promise<SearchProject> {
    const profile = await this.assertProfile(userEmail, profileId);
    const project = await this.store.save(
      userEmail,
      normalizeSearchProject(profileId, raw),
    );

    await this.rome.suggest(userEmail, profileId, [
      ...project.targetRoles,
      profile.headline,
    ]);

    return project;
  }

  async listRome(userEmail: string, profileId: string) {
    await this.assertProfile(userEmail, profileId);

    return this.rome.list(userEmail, profileId);
  }

  async confirmRome(userEmail: string, profileId: string, code: string) {
    await this.assertProfile(userEmail, profileId);

    return this.rome.confirm(userEmail, profileId, code);
  }

  async dismissRome(userEmail: string, profileId: string, code: string) {
    await this.assertProfile(userEmail, profileId);

    return this.rome.dismiss(userEmail, profileId, code);
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
