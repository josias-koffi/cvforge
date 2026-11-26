/**
 * Values the service worker keeps in `chrome.storage.local` (ADR-034 §3):
 * OAuth client, tokens and the candidate's AI key. The side panel never reads
 * this storage directly: it asks the service worker for a masked state.
 */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(...keys: string[]): Promise<void>;
}

export function chromeLocalStore(): KeyValueStore {
  return {
    async get<T>(key: string) {
      const values = await browser.storage.local.get(key);
      return values[key] as T | undefined;
    },
    set: (key, value) => browser.storage.local.set({ [key]: value }),
    remove: (...keys) => browser.storage.local.remove(keys),
  };
}
