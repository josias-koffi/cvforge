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
  return storeOf(browser.storage.local);
}

/** Kept while the browser runs, never written to disk: the queue (US-204). */
export function chromeSessionStore(): KeyValueStore {
  return storeOf(browser.storage.session);
}

function storeOf(area: Browser.storage.StorageArea): KeyValueStore {
  return {
    async get<T>(key: string) {
      const values = await area.get(key);
      return values[key] as T | undefined;
    },
    set: (key, value) => area.set({ [key]: value }),
    remove: (...keys) => area.remove(keys),
  };
}
