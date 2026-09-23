import { BadRequestException, Logger } from "@nestjs/common";
import type { SearchProjectRomeAppellation } from "@cvforge/types";
import type { RomeAppellationsReader } from "../rome/rome-appellations.pg-reader";
import { bestAppellations, type RomeoClient } from "../rome/romeo.client";
import type { SearchProjectRomeStore } from "./search-project-rome.pg-store";

/** How many appellations ROMEO may put in front of the candidate at once. */
const SUGGESTIONS_SHOWN = 5;

/**
 * The ROME jobs of a search project (US-118): ROMEO suggests, the candidate
 * decides. Ownership of the profile is checked by the caller.
 */
export class SearchProjectRomeService {
  private readonly logger = new Logger(SearchProjectRomeService.name);

  constructor(
    private readonly store: SearchProjectRomeStore,
    private readonly romeo: RomeoClient,
    private readonly appellations: RomeAppellationsReader,
  ) {}

  list(
    userEmail: string,
    profileId: string,
  ): Promise<SearchProjectRomeAppellation[]> {
    return this.store.list(userEmail, profileId);
  }

  /**
   * Asks ROMEO what the candidate's words mean, and replaces the pending
   * suggestions with the answer. Never throws: the project is already saved,
   * and a suggestion is a bonus — ROMEO down means the previous ones stay.
   */
  async suggest(
    userEmail: string,
    profileId: string,
    texts: string[],
  ): Promise<void> {
    try {
      const predictions = await this.romeo.predict(texts);

      if (predictions === null) {
        this.logger.warn(
          `ROMEO unavailable: suggestions for ${profileId} left as they were.`,
        );
        return;
      }

      const decided = await this.store.decidedCodes(userEmail, profileId);
      await this.store.replaceSuggestions(
        userEmail,
        profileId,
        bestAppellations(predictions, decided, SUGGESTIONS_SHOWN),
      );
    } catch (error) {
      this.logger.warn(
        `ROME suggestions failed for ${profileId}: ${String(error)}`,
      );
    }
  }

  /**
   * A suggestion keeps what ROMEO said about it; anything else must exist in
   * the local referential — a code typed by hand is not trusted.
   */
  async confirm(userEmail: string, profileId: string, code: string) {
    const appellation =
      (await this.store.findOne(userEmail, profileId, code)) ??
      (await this.appellations.find(code));

    if (!appellation) {
      throw new BadRequestException(
        "Ce métier est inconnu du référentiel ROME.",
      );
    }

    await this.store.confirm(userEmail, profileId, appellation);

    return this.store.list(userEmail, profileId);
  }

  async dismiss(userEmail: string, profileId: string, code: string) {
    await this.store.dismiss(userEmail, profileId, code);

    return this.store.list(userEmail, profileId);
  }
}
