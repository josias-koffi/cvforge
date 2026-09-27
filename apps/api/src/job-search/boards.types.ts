import type { BoardProvider } from "./sources/boards/detect-board";

/** Where a registry entry came from. A guess is not a certainty. */
export const boardOrigins = [
  "seed",
  "crawl",
  "france_travail",
  "user",
  "admin",
  /** Name known, address guessed, board verified live. */
  "probe",
] as const;
export type BoardOrigin = (typeof boardOrigins)[number];

export interface RegisteredBoard {
  provider: BoardProvider;
  boardToken: string;
  companyName: string;
  enabled: boolean;
  origin: BoardOrigin;
  lastFetchedAt: string | null;
  lastStatus: string | null;
  lastJobCount: number;
  consecutiveFailures: number;
  createdAt: string;
}

export interface BoardRegistration {
  provider: BoardProvider;
  boardToken: string;
  companyName?: string;
  origin: BoardOrigin;
}

/** DI token for the job boards registry. */
export const JOB_BOARDS_STORE = Symbol("JOB_BOARDS_STORE");

export type JobBoardsStore = {
  /**
   * Adds a company, or leaves the existing row alone. Registration happens on
   * every imported application and every partner link, so it must never
   * overwrite an admin's decision to disable a board.
   */
  register(board: BoardRegistration): Promise<RegisteredBoard>;
  listEnabled(): Promise<RegisteredBoard[]>;
  list(options?: { limit?: number; provider?: BoardProvider }): Promise<RegisteredBoard[]>;
  find(provider: BoardProvider, boardToken: string): Promise<RegisteredBoard | null>;
  setEnabled(
    provider: BoardProvider,
    boardToken: string,
    enabled: boolean,
  ): Promise<RegisteredBoard | null>;
  /** Records the outcome of a collection: a count, or a failure. */
  recordFetch(
    provider: BoardProvider,
    boardToken: string,
    outcome: { jobCount: number; status: string; failed: boolean; gone?: boolean },
  ): Promise<RegisteredBoard | null>;
};
