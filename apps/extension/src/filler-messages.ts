import type { FormMapRule } from "./domain/form-map";
import type { PrefillData } from "./domain/field-match";
import type { DocumentKind } from "./page/attach";
import type { PrefillDocument } from "./page/prefill";

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
  | { type: "filler/probe" }
  /** What the fields hold after a fill, by shape (US-205). */
  | { type: "filler/values" }
  | {
      type: "filler/prefill";
      data: PrefillData;
      documents: Record<DocumentKind, PrefillDocument>;
      /** The learned map of this site's forms (US-205). */
      rules?: FormMapRule[];
    };

/** Is this tab already the form, or where is it? */
export type PageProbe = { fieldCount: number; applyLink: string | null };

/** The script in the recruiter's tab → the service worker. */
export type FillerRequest =
  | { type: "filler/llm-fetch"; url: string; body?: string }
  | { type: "filler/document"; kind: DocumentKind }
  | { type: "filler/ask"; question: string }
  | { type: "filler/draft"; question: string };

/** Service worker → side panel: the agent needs the candidate. */
export type PanelEvent = {
  type: "panel/question";
  id: string;
  question: string;
};
