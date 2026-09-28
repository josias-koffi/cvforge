import { APPLICATION_SOURCE_SPONTANEOUS } from "@cvforge/types";
import { describe, expect, it, vi } from "vitest";
import { makeStoredApplication } from "./cv-generation.fixtures";
import { withOfferKeywords } from "./cv-generation.offer-keywords";

const LEGACY = makeStoredApplication();
delete LEGACY.extracted.keywords;

function chatReturning(payload: unknown) {
  return { chat: vi.fn().mockResolvedValue(JSON.stringify(payload)) };
}

describe("withOfferKeywords", () => {
  it("extracts keywords for an offer structured before they existed", async () => {
    const openRouter = chatReturning({
      keywords: ["TypeScript", "React"],
      summary: "Autre resume",
      title: "Autre titre",
    });

    const application = await withOfferKeywords(openRouter, LEGACY);

    expect(application.extracted.keywords).toEqual(["TypeScript", "React"]);
    // Fields the candidate may have corrected are not overwritten.
    expect(application.extracted.title).toBe(LEGACY.extracted.title);
    expect(application.extracted.summary).toBe(LEGACY.extracted.summary);
  });

  it("calls no model when the offer already has keywords", async () => {
    const openRouter = chatReturning({});

    await withOfferKeywords(openRouter, makeStoredApplication());

    expect(openRouter.chat).not.toHaveBeenCalled();
  });

  it("leaves a spontaneous application alone: there is no offer", async () => {
    const openRouter = chatReturning({});

    await withOfferKeywords(openRouter, {
      ...LEGACY,
      sourceType: APPLICATION_SOURCE_SPONTANEOUS,
    });

    expect(openRouter.chat).not.toHaveBeenCalled();
  });

  it("keeps the application unchanged when the extraction fails", async () => {
    const openRouter = { chat: vi.fn().mockRejectedValue(new Error("down")) };
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await withOfferKeywords(openRouter, LEGACY)).toBe(LEGACY);
  });
});
