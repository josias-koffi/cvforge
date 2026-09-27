import { Logger } from "@nestjs/common";
import type { RomeoClient } from "../rome/romeo.client";
import {
  competenceTexts,
  keptCompetences,
  textsFingerprint,
} from "./profile-competences.inference";
import type { ProfileCompetencesStore } from "./profile-competences.pg-store";
import type { StoredProfile } from "./profiles.types";

/**
 * The ROME competences of a candidate's CV (US-125): ROMEO reads them when
 * the profile is saved, the candidate removes the wrong ones. Ownership of the
 * profile is checked by the caller.
 */
export class ProfileCompetencesService {
  private readonly logger = new Logger(ProfileCompetencesService.name);

  constructor(
    private readonly store: ProfileCompetencesStore,
    private readonly romeo: RomeoClient,
  ) {}

  list(userEmail: string, profileId: string) {
    return this.store.list(userEmail, profileId);
  }

  async dismiss(userEmail: string, profileId: string, code: string) {
    await this.store.dismiss(userEmail, profileId, code);

    return this.store.list(userEmail, profileId);
  }

  /**
   * Reads again every saved profile whose texts changed since the last
   * reading — an unchanged CV costs no call (ADR-024). Never throws: the
   * profiles are already saved, and a ROMEO outage only delays the reading to
   * the next save, since its fingerprint is then not recorded.
   */
  async refresh(userEmail: string, profiles: readonly StoredProfile[]) {
    try {
      await this.store.forgetOtherProfiles(
        userEmail,
        profiles.map((profile) => profile.id),
      );

      for (const profile of profiles) {
        await this.refreshOne(userEmail, profile);
      }
    } catch (error) {
      this.logger.warn(
        `ROME competences failed for ${userEmail}: ${String(error)}`,
      );
    }
  }

  private async refreshOne(userEmail: string, profile: StoredProfile) {
    const texts = competenceTexts(profile);
    const fingerprint = textsFingerprint(texts);

    if ((await this.store.fingerprint(userEmail, profile.id)) === fingerprint)
      return;

    const predictions = await this.romeo.predictCompetences(texts);

    if (predictions === null) {
      this.logger.warn(
        `ROMEO unavailable: competences of ${profile.id} left as they were.`,
      );
      return;
    }

    const dismissed = await this.store.dismissedCodes(userEmail, profile.id);
    await this.store.replaceInferred(
      userEmail,
      profile.id,
      fingerprint,
      keptCompetences(predictions, dismissed).map(
        ({ textIndex: _textIndex, ...competence }) => competence,
      ),
    );
  }
}
