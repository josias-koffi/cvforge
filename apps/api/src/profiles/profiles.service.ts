import { Injectable } from "@nestjs/common";
import type { ProfileCompetencesService } from "./profile-competences.service";
import type { ProfilesStore, StoredProfileRegistry } from "./profiles.types";

@Injectable()
export class ProfilesService {
  constructor(
    private readonly store: ProfilesStore,
    private readonly competences: ProfileCompetencesService,
  ) {}

  getRegistry(userEmail: string): Promise<StoredProfileRegistry | null> {
    return this.store.findByUserEmail(userEmail);
  }

  /**
   * Saving is the moment ROMEO reads the CV's competences (US-125), after the
   * registry is stored: a ROMEO failure never costs the save.
   */
  async saveRegistry(
    userEmail: string,
    registry: StoredProfileRegistry,
  ): Promise<StoredProfileRegistry> {
    const saved = await this.store.save(userEmail, registry);

    await this.competences.refresh(userEmail, saved.profiles);

    return saved;
  }

  /** The profile, if it belongs to this user. */
  async findProfile(userEmail: string, profileId: string) {
    const registry = await this.store.findByUserEmail(userEmail);

    return (
      registry?.profiles.find((profile) => profile.id === profileId) ?? null
    );
  }
}
