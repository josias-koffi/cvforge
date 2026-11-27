const LOAD_TIMEOUT_MS = 30_000;
/** Single-page application forms keep drawing after `complete`. */
export const SETTLE_MS = 2_500;

/**
 * Resolves once `tabId` has loaded and settled, after `start` (a navigation
 * or a tab creation) has been triggered. Rejects after thirty seconds.
 */
export function loaded(
  start: () => Promise<{ id?: number } | undefined | void>,
  tabId?: number,
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let watched = tabId;
    const timer = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      reject(new Error("La page met trop de temps à s'ouvrir."));
    }, LOAD_TIMEOUT_MS);
    const listener = (id: number, change: { status?: string }) => {
      if (watched === undefined || id !== watched) return;
      if (change.status !== "complete") return;
      clearTimeout(timer);
      browser.tabs.onUpdated.removeListener(listener);
      setTimeout(() => resolve(id), SETTLE_MS);
    };
    browser.tabs.onUpdated.addListener(listener);
    start().then(
      (created) => {
        if (watched === undefined && created && created.id !== undefined) {
          watched = created.id;
        }
      },
      (error: unknown) => {
        clearTimeout(timer);
        browser.tabs.onUpdated.removeListener(listener);
        reject(error);
      },
    );
  });
}
