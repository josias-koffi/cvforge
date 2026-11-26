import type { AiKeySettings } from "./application/session";
import type { PanelState } from "./domain/connection";

/** What the side panel may ask the service worker. */
export type PanelRequest =
  | { type: "state" }
  | { type: "connect" }
  | { type: "disconnect" }
  | { type: "save-ai-key"; settings: AiKeySettings }
  | { type: "clear-ai-key" };

export type PanelResponse =
  | { ok: true; state: PanelState }
  | { ok: false; error: string };

/** Sends a request to the service worker; a failure comes back as an Error. */
export async function askBackground(
  request: PanelRequest,
): Promise<PanelState> {
  const response = (await browser.runtime.sendMessage(
    request,
  )) as PanelResponse;
  if (!response.ok) throw new Error(response.error);
  return response.state;
}
