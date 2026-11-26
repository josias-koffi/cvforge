import type { FillTab } from "../application/filling";
import type { FillerReply } from "../filler-messages";

/** Injects the filler (page-agent) into the recruiter's tab and runs it. */
export function chromeFillTab(): FillTab {
  return {
    async run(tabId, request) {
      await browser.scripting.executeScript({
        files: ["/filler.js"],
        target: { tabId },
      });
      return (await browser.tabs.sendMessage(tabId, request, {
        frameId: 0,
      })) as FillerReply;
    },
  };
}
