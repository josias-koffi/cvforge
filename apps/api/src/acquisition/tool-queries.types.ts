import type { ToolQueryTool } from "../database/schema";

export const TOOL_QUERY_STORE = Symbol("TOOL_QUERY_STORE");

/** One search in a free tool (US-155). `day` is an ISO date. */
export type NewToolQuery = {
  day: string;
  tool: ToolQueryTool;
  queryKey: string;
  label: string;
  /** The department searched with a job; "" for a company. */
  place: string;
};

export type ToolQueryStore = {
  /** Adds one to the day's counter for that search. */
  increment: (query: NewToolQuery) => Promise<void>;
  /** Drops every day strictly before `day`; answers how many rows went. */
  deleteBefore: (day: string) => Promise<number>;
};
