import type { BadgeHost } from "../application/page-badge";
import type { PageSignals } from "../domain/badge";
import { WEB_PAGE_ORIGINS } from "./page-reader";

/** The badge in Chrome (US-207): a probe script, then a per-tab badge. */
export function chromeBadgeHost(): BadgeHost {
  return {
    canReadPages: () =>
      browser.permissions.contains({ origins: WEB_PAGE_ORIGINS }),
    async probe(tabId) {
      const [result] = await browser.scripting.executeScript({
        files: ["/probe.js"],
        target: { tabId },
      });
      return (result?.result as PageSignals | undefined) ?? null;
    },
    async show(tabId, badge) {
      await browser.action.setBadgeText({ tabId, text: badge?.text ?? "" });
      await browser.action.setTitle({
        tabId,
        title: badge?.title ?? "Ouvrir JobSpark",
      });
      if (badge) {
        await browser.action.setBadgeBackgroundColor({
          color: badge.color,
          tabId,
        });
        await browser.action
          .setBadgeTextColor({ color: "#FFFFFF", tabId })
          .catch(() => undefined);
      }
    },
  };
}
