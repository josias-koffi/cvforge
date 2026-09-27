import type { NormalizedJobListing } from "../../job-search.types";
import type { BoardProvider } from "./detect-board";

/**
 * A company's own job board.
 *
 * Unlike France Travail, these cannot be searched: each one answers with the
 * full list of a single company's openings. The daily collection reads every
 * registered company and filters locally, which is why the registry — not the
 * query — is what decides coverage.
 */
export interface CompanyBoardAdapter {
  readonly provider: BoardProvider;
  /**
   * Every offer of that company, already filtered to France or remote.
   * Throws when the board cannot be read, so the caller can count the failure
   * against the company and disable it after too many.
   */
  fetchBoard(boardToken: string): Promise<NormalizedJobListing[]>;
}

/** The board is gone for good: a 404 or a 410, not a transient failure. */
export class BoardNotFoundError extends Error {
  constructor(provider: BoardProvider, target: string) {
    super(`${provider} has no board at ${target}.`);
  }
}
