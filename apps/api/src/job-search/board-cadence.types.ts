import type { BoardProvider } from "./sources/boards/detect-board";

/** DI token for what decides how often a company's board is read (US-164). */
export const BOARD_CADENCE_STORE = Symbol("BOARD_CADENCE_STORE");

/** A posting as the frequent pass records it: an id and a claimed date. */
export interface SeenPosting {
  externalId: string;
  announcedAt: string | null;
}

/** A board worth reading every half hour, and how recently it earned it. */
export interface FrequentBoard {
  provider: BoardProvider;
  boardToken: string;
  /** Latest sign of interest: a match, a saved offer, an application. */
  interestAt: Date;
}

export type BoardCadenceStore = {
  /** Ids this board already showed: the frequent pass skips their details. */
  knownIds(provider: BoardProvider, boardToken: string): Promise<Set<string>>;
  /**
   * Records what the board shows now; returns the ids never seen before, with
   * the detection time stored next to the announced one.
   */
  recordSeen(
    provider: BoardProvider,
    boardToken: string,
    postings: readonly SeenPosting[],
  ): Promise<Set<string>>;
  /** A 429 or a 403: back to the daily pass until `until`. */
  pauseFrequent(provider: BoardProvider, boardToken: string, until: Date): Promise<void>;
  /**
   * Enabled, not paused boards with an offer that matched a search since
   * `matchedSince`, or one a candidate saved or applied to since
   * `followedSince`. Applications imported by URL are added by the caller.
   */
  listInterested(input: {
    matchedSince: Date;
    followedSince: Date;
    now: Date;
  }): Promise<FrequentBoard[]>;
  /** Offer URLs of the applications created since then. */
  listApplicationUrls(since: Date): Promise<Array<{ url: string; createdAt: Date }>>;
  /** Enabled, not paused boards among these, for the applications' companies. */
  filterReadable(
    boards: ReadonlyArray<{ provider: BoardProvider; boardToken: string }>,
    now: Date,
  ): Promise<Array<{ provider: BoardProvider; boardToken: string }>>;
};
