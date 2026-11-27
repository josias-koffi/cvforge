import type { FillTab } from "../application/filling";
import type { FillerReply, PageProbe } from "../filler-messages";
import type { PrefillReport } from "../page/prefill";
import { loaded } from "./tab-load";

const inject = (tabId: number) =>
  browser.scripting.executeScript({ files: ["/filler.js"], target: { tabId } });

/** Injects the filler (page-agent) into the recruiter's tab and runs it. */
export function chromeFillTab(): FillTab {
  return {
    async probe(tabId) {
      await inject(tabId);
      return (await browser.tabs.sendMessage(
        tabId,
        { type: "filler/probe" },
        { frameId: 0 },
      )) as PageProbe;
    },
    async open(tabId, url) {
      await loaded(() => browser.tabs.update(tabId, { url }), tabId);
    },
    async prefill(tabId, request) {
      await inject(tabId);
      const report = (await browser.tabs.sendMessage(
        tabId,
        { type: "filler/prefill", ...request },
        { frameId: 0 },
      )) as PrefillReport | { error: string };
      if ("error" in report) throw new Error(report.error);
      return report;
    },
    async run(tabId, request) {
      await inject(tabId);
      return (await browser.tabs.sendMessage(tabId, request, {
        frameId: 0,
      })) as FillerReply;
    },
  };
}
