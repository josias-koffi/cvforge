import type { AiKeySettings, AiKeyStore } from "../application/session";
import type { KeyValueStore } from "./local-store";

const KEY = "ai.settings";

/** The candidate's own model key (ADR-034 §8), kept in the service worker's storage. */
export function localAiKeyStore(store: KeyValueStore): AiKeyStore {
  return {
    get: async () => (await store.get<AiKeySettings>(KEY)) ?? null,
    save: (settings) => store.set(KEY, settings),
    clear: () => store.remove(KEY),
  };
}
