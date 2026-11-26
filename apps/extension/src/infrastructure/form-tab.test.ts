import { afterEach, describe, expect, it, vi } from "vitest";
import { chromeFormTab } from "./form-tab";

const spy = (target: object, method: string) =>
  vi.spyOn(target as Record<string, () => unknown>, method as never);

describe("chromeFormTab", () => {
  afterEach(() => vi.restoreAllMocks());

  it("asks the filler in the tab to read the form or submit it", async () => {
    const inject = spy(browser.scripting, "executeScript").mockResolvedValue(
      [] as never,
    );
    const send = spy(browser.tabs, "sendMessage").mockResolvedValue({
      fields: [],
    } as never);
    expect(await chromeFormTab().read(3)).toEqual({ fields: [] });
    await chromeFormTab().submit(3);
    expect(inject).toHaveBeenCalledWith({
      files: ["/filler.js"],
      target: { tabId: 3 },
    });
    expect(send).toHaveBeenNthCalledWith(
      1,
      3,
      { type: "filler/read-form" },
      { frameId: 0 },
    );
    expect(send).toHaveBeenNthCalledWith(
      2,
      3,
      { type: "filler/submit" },
      { frameId: 0 },
    );
  });

  it("looks at what the tab shows now", async () => {
    spy(browser.scripting, "executeScript").mockResolvedValue([
      { result: { text: "Merci", url: "https://x/thanks" } },
    ] as never);
    expect(await chromeFormTab().observe(3)).toEqual({
      text: "Merci",
      url: "https://x/thanks",
    });
  });

  it("captures a JPEG, lowering quality to fit, or gives up", async () => {
    const capture = spy(browser.tabs, "captureVisibleTab")
      .mockResolvedValueOnce(
        `data:image/jpeg;base64,${"A".repeat(900_000)}` as never,
      )
      .mockResolvedValueOnce("data:image/jpeg;base64,QUJD" as never);
    expect(await chromeFormTab().capture()).toEqual({
      base64: "QUJD",
      type: "image/jpeg",
    });
    expect(capture).toHaveBeenLastCalledWith({ format: "jpeg", quality: 35 });

    capture.mockResolvedValue(
      `data:image/jpeg;base64,${"A".repeat(900_000)}` as never,
    );
    expect(await chromeFormTab().capture()).toBeNull();
  });
});
