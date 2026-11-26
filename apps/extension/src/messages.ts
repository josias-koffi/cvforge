import type {
  OfferInspection,
  PreparationResult,
} from "./application/preparation";
import type { FillOptions, FillOutcome } from "./application/filling";
import type { Review, SendOutcome } from "./application/sending";
import type { AiKeySettings } from "./application/session";
import type { PanelState } from "./domain/connection";

/** What the side panel may ask the service worker, and what each returns. */
export type PanelRequests = {
  state: { request: { type: "state" }; response: PanelState };
  connect: { request: { type: "connect" }; response: PanelState };
  disconnect: { request: { type: "disconnect" }; response: PanelState };
  "save-ai-key": {
    request: { type: "save-ai-key"; settings: AiKeySettings };
    response: PanelState;
  };
  "clear-ai-key": { request: { type: "clear-ai-key" }; response: PanelState };
  "inspect-offer": {
    request: { type: "inspect-offer" };
    response: OfferInspection;
  };
  "prepare-offer": {
    request: { type: "prepare-offer"; url: string; cost: number };
    response: PreparationResult;
  };
  "fill-options": { request: { type: "fill-options" }; response: FillOptions };
  fill: {
    request: { type: "fill"; applicationId: string; url: string };
    response: FillOutcome;
  };
  review: { request: { type: "review" }; response: Review };
  send: {
    request: { type: "send"; applicationId: string; url: string };
    response: SendOutcome;
  };
  "answer-question": {
    request: {
      type: "answer-question";
      id: string;
      answer: string;
      save: boolean;
    };
    response: null;
  };
};

export type PanelRequest = PanelRequests[keyof PanelRequests]["request"];

export type PanelResponse =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

/** Sends a request to the service worker; a failure comes back as an Error. */
export async function askBackground<T extends PanelRequest>(
  request: T,
): Promise<PanelRequests[T["type"]]["response"]> {
  const response = (await browser.runtime.sendMessage(
    request,
  )) as PanelResponse;
  if (!response.ok) throw new Error(response.error);
  return response.value as PanelRequests[T["type"]]["response"];
}
