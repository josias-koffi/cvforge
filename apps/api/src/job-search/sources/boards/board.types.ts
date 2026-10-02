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
  fetchBoard(
    boardToken: string,
    options?: FetchBoardOptions,
  ): Promise<NormalizedJobListing[]>;
}

export interface FetchBoardOptions {
  /**
   * Postings already seen on this board. An adapter that pays a call per
   * posting (SmartRecruiters) leaves them out; the others return everything
   * and the caller filters (US-164).
   */
  skipExternalIds?: ReadonlySet<string>;
}

/**
 * The provider asked us to slow down (429, after the retries) or refused us
 * (403). Not a failure of the company: the frequent pass backs off (US-164).
 */
export class BoardRefusedError extends Error {
  constructor(
    provider: BoardProvider,
    readonly status: number,
  ) {
    super(`${provider} answered ${status}.`);
  }
}

/** The board is gone for good: a 404 or a 410, not a transient failure. */
export class BoardNotFoundError extends Error {
  constructor(provider: BoardProvider, target: string) {
    super(`${provider} has no board at ${target}.`);
  }
}
