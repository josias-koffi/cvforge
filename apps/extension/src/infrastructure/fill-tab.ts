import type { FillTab } from "../application/filling";
import type { FillerReply, PageProbe } from "../filler-messages";
import type { PrefillReport } from "../page/prefill";

const LOAD_TIMEOUT_MS = 20_000;
/** Single-page application forms keep drawing after `complete`. */
const SETTLE_MS = 2_500;

const inject = (tabId: number) =>
  browser.scripting.executeScript({ files: ["/filler.js"], target: { tabId } });

function waitForLoad(tabId: number, url: string) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      reject(new Error("Le formulaire met trop de temps à s'ouvrir."));
    }, LOAD_TIMEOUT_MS);
    const listener = (id: number, change: { status?: string }) => {
      if (id !== tabId || change.status !== "complete") return;
      clearTimeout(timer);
      browser.tabs.onUpdated.removeListener(listener);
      setTimeout(resolve, SETTLE_MS);
    };
    browser.tabs.onUpdated.addListener(listener);
    browser.tabs.update(tabId, { url }).catch((error: unknown) => {
      clearTimeout(timer);
      browser.tabs.onUpdated.removeListener(listener);
      reject(error);
    });
  });
}

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
    open: (tabId, url) => waitForLoad(tabId, url),
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
