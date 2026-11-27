import type { ActiveTab } from "../application/preparation";
import type { QueueTabs } from "../application/queue";
import { isWebPage } from "../domain/offer";
import { loaded } from "./tab-load";

const asOffer = (tab: Browser.tabs.Tab): ActiveTab | null =>
  tab.id !== undefined && isWebPage(tab.url)
    ? { tabId: tab.id, title: tab.title ?? "", url: tab.url }
    : null;

/** The queue's tabs (US-204): opened in the background, shown on demand. */
export function chromeQueueTabs(): QueueTabs {
  return {
    async open(url) {
      const tabId = await loaded(() =>
        browser.tabs.create({ active: false, url }),
      );
      const tab = asOffer(await browser.tabs.get(tabId));
      if (!tab) throw new Error("Cette page ne peut pas être lue.");
      return tab;
    },
    async current(tabId) {
      try {
        return asOffer(await browser.tabs.get(tabId));
      } catch {
        return null; // closed by the candidate
      }
    },
    async focus(tabId) {
      const tab = await browser.tabs.update(tabId, { active: true });
      if (tab?.windowId !== undefined) {
        await browser.windows.update(tab.windowId, { focused: true });
      }
    },
    async close(tabId) {
      await browser.tabs.remove(tabId);
    },
    async openOffers() {
      const tabs = await browser.tabs.query({ lastFocusedWindow: true });
      return tabs.map(asOffer).filter((tab) => tab !== null);
    },
  };
}

/**
 * Chrome stops an idle service worker after thirty seconds, even while a CV
 * is being generated: an extension call every twenty seconds keeps the queue
 * alive. Returns the function that stops it.
 */
export function keepServiceWorkerAlive(): () => void {
  const timer = setInterval(() => {
    void browser.runtime.getPlatformInfo();
  }, 20_000);
  return () => clearInterval(timer);
}
