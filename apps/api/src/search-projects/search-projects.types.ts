import type { SearchProject } from "@cvforge/types";

/** DI token for the search projects store. */
export const SEARCH_PROJECTS_STORE = Symbol("SEARCH_PROJECTS_STORE");

export type SearchProjectsStore = {
  findByProfileId(
    userEmail: string,
    profileId: string,
  ): Promise<SearchProject | null>;
  listByUserEmail(userEmail: string): Promise<SearchProject[]>;
  /** Every search whose owner asked for the morning selection. */
  listDigestEnabled(): Promise<
    Array<{ userEmail: string; project: SearchProject }>
  >;
  /**
   * Every search, morning selection or not. The collection reads this one:
   * a candidate who turned the daily email off still configured what they are
   * looking for, and the offers they want belong in the database all the same
   * — that is what the search page serves.
   */
  listAll(): Promise<Array<{ userEmail: string; project: SearchProject }>>;
  save(userEmail: string, project: SearchProject): Promise<SearchProject>;
  deleteByUserEmail(userEmail: string): Promise<number>;
};
