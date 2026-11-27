import type { QueueReport } from "../domain/queue";

const NOTIFICATION_ID = "jobspark-queue";

/**
 * The end of a queue as a Chrome notification (US-209). A click opens the
 * side panel on the queue; when Chrome refuses (no user gesture seen), it
 * brings forward the tab of the first form waiting for the candidate.
 */
export function chromeQueueNotifier(
  firstWaitingTab: () => Promise<number | null>,
) {
  browser.notifications.onClicked.addListener((id) => {
    if (id !== NOTIFICATION_ID) return;
    void browser.notifications.clear(id);
    void (async () => {
      const window = await browser.windows.getLastFocused();
      try {
        await browser.sidePanel.open({ windowId: window.id! });
      } catch {
        const tabId = await firstWaitingTab();
        if (tabId === null) return;
        const tab = await browser.tabs.update(tabId, { active: true });
        if (tab?.windowId !== undefined) {
          await browser.windows.update(tab.windowId, { focused: true });
        }
      }
    })();
  });

  return async (report: QueueReport) => {
    await browser.notifications.create(NOTIFICATION_ID, {
      iconUrl: browser.runtime.getURL("/icon/128.png"),
      message: report.message,
      title: report.title,
      type: "basic",
    });
  };
}
