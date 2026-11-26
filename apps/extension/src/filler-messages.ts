import type { DocumentKind } from "./page/attach";

/** Service worker → the script in the recruiter's tab. */
export type FillerRun = {
  type: "filler/run";
  task: string;
  /** No key here: the service worker adds it to each relayed call. */
  llm: { baseURL: string; model: string };
};

export type FillerReply = { success: boolean; summary: string; steps: number };

/** Service worker → the script in the tab, outside a fill (US-198). */
export type FormRequest =
  | { type: "filler/read-form" }
  | { type: "filler/submit" }
  | { type: "filler/probe" };

/** Is this tab already the form, or where is it? */
export type PageProbe = { fieldCount: number; applyLink: string | null };

/** The script in the recruiter's tab → the service worker. */
export type FillerRequest =
  | { type: "filler/llm-fetch"; url: string; body?: string }
  | { type: "filler/document"; kind: DocumentKind }
  | { type: "filler/ask"; question: string };

/** Service worker → side panel: the agent needs the candidate. */
export type PanelEvent = {
  type: "panel/question";
  id: string;
  question: string;
};
