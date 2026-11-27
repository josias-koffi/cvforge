import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { signedFileDownloader, toBase64 } from "./download";
import { chromeFillTab } from "./fill-tab";
import { PanelChannel } from "./panel-channel";

describe("toBase64 / signedFileDownloader", () => {
  it("encodes large files without overflowing", () => {
    const bytes = new Uint8Array(200_000).fill(65);
    expect(atob(toBase64(bytes))).toHaveLength(200_000);
  });

  it("downloads a signed link and keeps its type", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(new Uint8Array([37, 80, 68, 70]), {
          headers: { "content-type": "application/pdf; charset=binary" },
        }),
    );
    const file = await signedFileDownloader(fetchFn as unknown as typeof fetch)(
      "https://x/f",
    );
    expect(file).toEqual({ base64: "JVBERg==", mime: "application/pdf" });
  });

  it("fails on an expired link", async () => {
    const fetchFn = vi.fn(async () => new Response("", { status: 410 }));
    await expect(
      signedFileDownloader(fetchFn as unknown as typeof fetch)("https://x/f"),
    ).rejects.toThrow("410");
  });
});

describe("PanelChannel", () => {
  afterEach(() => vi.useRealTimers());

  it("delivers the candidate's answer for that question", async () => {
    const send = vi.fn(async (_event: unknown) => undefined);
    const channel = new PanelChannel(send);
    const pending = channel.ask("Salaire ?");
    const { id } = send.mock.calls[0]![0] as { id: string };
    channel.answer(id, " 45 k€ ", true);
    expect(await pending).toEqual({ answer: "45 k€", save: true });
  });

  it("treats an empty answer as none", async () => {
    const send = vi.fn(async (_event: unknown) => undefined);
    const channel = new PanelChannel(send);
    const pending = channel.ask("?");
    channel.answer((send.mock.calls[0]![0] as { id: string }).id, "  ", true);
    expect(await pending).toEqual({ answer: null, save: false });
  });

  it("gives up when the panel is closed or silent", async () => {
    const closed = new PanelChannel(async () => {
      throw new Error("Receiving end does not exist");
    });
    expect(await closed.ask("?")).toEqual({ answer: null, save: false });

    vi.useFakeTimers();
    const silent = new PanelChannel(async () => undefined, 1000);
    const pending = silent.ask("?");
    vi.advanceTimersByTime(1001);
    expect(await pending).toEqual({ answer: null, save: false });
  });
});

describe("chromeFillTab", () => {
  afterEach(() => vi.restoreAllMocks());

  it("asks the filler whether the tab is the form", async () => {
    vi.spyOn(browser.scripting, "executeScript" as never).mockResolvedValue(
      [] as never,
    );
    const send = vi
      .spyOn(browser.tabs, "sendMessage" as never)
      .mockResolvedValue({ applyLink: null, fieldCount: 5 } as never);
    expect(await chromeFillTab().probe(5)).toEqual({
      applyLink: null,
      fieldCount: 5,
    });
    expect(send).toHaveBeenCalledWith(
      5,
      { type: "filler/probe" },
      { frameId: 0 },
    );
  });

  it("opens the form and waits until it has loaded", async () => {
    vi.useFakeTimers();
    const update = vi
      .spyOn(browser.tabs, "update" as never)
      .mockResolvedValue({} as never);
    const opened = chromeFillTab().open(5, "https://jobs.lever.co/a/1/apply");
    await fakeBrowser.tabs.onUpdated.trigger(
      4,
      { status: "complete" },
      {} as never,
    );
    await fakeBrowser.tabs.onUpdated.trigger(
      5,
      { status: "complete" },
      {} as never,
    );
    await vi.advanceTimersByTimeAsync(3_000);
    await expect(opened).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith(5, {
      url: "https://jobs.lever.co/a/1/apply",
    });
    vi.useRealTimers();
  });

  it("gives up on a form that never loads", async () => {
    vi.useFakeTimers();
    vi.spyOn(browser.tabs, "update" as never).mockResolvedValue({} as never);
    const opened = chromeFillTab().open(5, "https://jobs.lever.co/a/1/apply");
    const failure = expect(opened).rejects.toThrow("trop de temps");
    await vi.advanceTimersByTimeAsync(31_000);
    await failure;
    vi.useRealTimers();
  });

  it("injects the filler in the tab, then asks its top frame to run", async () => {
    const inject = vi
      .spyOn(browser.scripting, "executeScript" as never)
      .mockResolvedValue([] as never);
    const send = vi
      .spyOn(browser.tabs, "sendMessage" as never)
      .mockResolvedValue({ steps: 1, success: true, summary: "ok" } as never);
    const request = {
      llm: { baseURL: "b", model: "m" },
      task: "t",
      type: "filler/run" as const,
    };

    expect(await chromeFillTab().run(5, request)).toEqual({
      steps: 1,
      success: true,
      summary: "ok",
    });
    expect(inject).toHaveBeenCalledWith({
      files: ["/filler.js"],
      target: { tabId: 5 },
    });
    expect(send).toHaveBeenCalledWith(5, request, { frameId: 0 });
  });
});
