import { afterEach, describe, expect, it, vi } from "vitest";
import { chromePageReader } from "./page-reader";

const spy = (target: object, method: string) =>
  vi.spyOn(target as Record<string, () => unknown>, method as never);

describe("chromePageReader", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reports missing access before looking at any tab", async () => {
    spy(browser.permissions, "contains").mockResolvedValue(false as never);
    const query = spy(browser.tabs, "query");
    expect(await chromePageReader().activeTab()).toBe("no-access");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns the active web page, and nothing for a browser page", async () => {
    spy(browser.permissions, "contains").mockResolvedValue(true as never);
    const query = spy(browser.tabs, "query").mockResolvedValueOnce([
      { id: 3, title: "Offre", url: "https://jobs.example/1" },
    ] as never);
    expect(await chromePageReader().activeTab()).toEqual({
      tabId: 3,
      title: "Offre",
      url: "https://jobs.example/1",
    });

    query.mockResolvedValueOnce([{ id: 4, url: "chrome://newtab/" }] as never);
    expect(await chromePageReader().activeTab()).toBeNull();
  });

  it("reads the page's visible text in the tab", async () => {
    const run = spy(browser.scripting, "executeScript").mockResolvedValueOnce([
      { result: "Texte de l'offre" },
    ] as never);
    expect(await chromePageReader().readText(3)).toBe("Texte de l'offre");
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ target: { tabId: 3 } }),
    );

    run.mockResolvedValueOnce([{ result: undefined }] as never);
    expect(await chromePageReader().readText(3)).toBe("");
  });
});
