import type { ActiveTab, PageReader } from "../application/preparation";
import { isWebPage } from "../domain/offer";

/**
 * Every web page, asked for only when the candidate first clicks "Autoriser"
 * (optional host permission, ADR-034 §3): the extension reads the offer and,
 * later, fills the recruiter's form, on whatever site the offer lives.
 */
export const WEB_PAGE_ORIGINS = ["https://*/*", "http://*/*"];

export function chromePageReader(): PageReader {
  return {
    async activeTab() {
      const allowed = await browser.permissions.contains({
        origins: WEB_PAGE_ORIGINS,
      });
      if (!allowed) return "no-access";
      const [tab] = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      if (!tab?.id || !isWebPage(tab.url)) return null;
      return {
        tabId: tab.id,
        title: tab.title ?? "",
        url: tab.url,
      } satisfies ActiveTab;
    },
    async readText(tabId) {
      const [frame] = await browser.scripting.executeScript({
        func: () => document.body?.innerText ?? "",
        target: { tabId },
      });
      return typeof frame?.result === "string" ? frame.result : "";
    },
  };
}
