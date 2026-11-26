import type { FormTab } from "../application/sending";
import type { FormRequest } from "../filler-messages";
import type { FormSnapshot } from "../page/form-state";

/** Under the MCP body limit (1 MiB) once in base64. */
const MAX_SCREENSHOT_BYTES = 600 * 1024;
const QUALITIES = [60, 35];

async function ask<T>(tabId: number, request: FormRequest): Promise<T> {
  // The filler guards against a second injection; after a reload it is gone.
  await browser.scripting.executeScript({
    files: ["/filler.js"],
    target: { tabId },
  });
  return (await browser.tabs.sendMessage(tabId, request, { frameId: 0 })) as T;
}

export function chromeFormTab(): FormTab {
  return {
    read: (tabId) => ask<FormSnapshot>(tabId, { type: "filler/read-form" }),
    submit: (tabId) => ask(tabId, { type: "filler/submit" }),
    async observe(tabId) {
      const [frame] = await browser.scripting.executeScript({
        func: () => ({
          text: (document.body?.innerText ?? "").slice(0, 20_000),
          url: location.href,
        }),
        target: { tabId },
      });
      return frame!.result as { url: string; text: string };
    },
    async capture() {
      for (const quality of QUALITIES) {
        const dataUrl = await browser.tabs.captureVisibleTab({
          format: "jpeg",
          quality,
        });
        const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
        if ((base64.length * 3) / 4 <= MAX_SCREENSHOT_BYTES) {
          return { base64, type: "image/jpeg" as const };
        }
      }
      return null;
    },
  };
}
