import { describe, expect, it } from "vitest";
import { cleanOfferText } from "./offer-input";
import { structureOffer, unstructuredOffer } from "./offer-structuring";

const NO_METADATA = { description: null, siteName: null, title: null };

function modelAnswering(answer: string) {
  return { chat: async () => answer };
}

describe("structureOffer", () => {
  it("keeps an offer whose text states no job title, instead of rejecting it", async () => {
    const offerText =
      "What is Finary?\n\nWe are on a mission to give power back to investors.";

    const extracted = await structureOffer(
      modelAnswering(
        JSON.stringify({ title: null, summary: "A fintech role." }),
      ),
      offerText,
      NO_METADATA,
      null,
      "text",
    );

    expect(extracted.title).toBe("What is Finary?");
    expect(extracted.summary).toBe("A fintech role.");
  });

  it("prefers the title the model found", async () => {
    const extracted = await structureOffer(
      modelAnswering(JSON.stringify({ title: "AI Product Engineer" })),
      "What is Finary?\n\nWe hire an AI product engineer.",
      NO_METADATA,
      null,
      "text",
    );

    expect(extracted.title).toBe("AI Product Engineer");
  });

  it("falls back to the text alone without a model", () => {
    expect(unstructuredOffer("Développeur Node\n\nUne mission.").title).toBe(
      "Développeur Node",
    );
  });
});

describe("cleanOfferText", () => {
  it("removes hidden characters and odd spaces but keeps words and accents", () => {
    const dirty =
      "\uFEFFD\u200Bév\u00ADeloppeur\u00A0senior\r\n\r\n\r\n\r\nParis\u202E \u{E0041}\u0007\t \nfin";

    expect(cleanOfferText(dirty)).toBe("Développeur senior\n\nParis\nfin");
  });

  it("collapses runs of empty lines to a single blank line", () => {
    expect(cleanOfferText("a\n\n\n\n\nb")).toBe("a\n\nb");
  });
});
