import type { AtsOfferContext } from "@cvforge/ats-score";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenRouterService } from "../ai/openrouter.service";
import { AtsImpactService } from "./ats-impact.service";

const CV_TEXT = `
Jean Dupont
jean.dupont@example.com
+33 6 12 34 56 78
Ingénieur plateforme
Réduit le temps de build de 40% en parallélisant la chaîne CI.
`;

const OFFER: AtsOfferContext = {
  requirements: ["typescript", "docker"],
  responsibilities: ["fiabiliser la chaîne de livraison"],
  title: "Ingénieur plateforme",
};

const VALID = {
  actionVerbs: 8,
  consistency: 6,
  highlights: ["Résultats chiffrés."],
  improvements: ["Quantifiez la seconde expérience."],
  quantification: 7,
  relevance: 9,
};

describe("AtsImpactService", () => {
  let openRouter: { chat: ReturnType<typeof vi.fn> };
  let service: AtsImpactService;

  beforeEach(() => {
    vi.clearAllMocks();
    openRouter = { chat: vi.fn().mockResolvedValue(JSON.stringify(VALID)) };
    service = new AtsImpactService(openRouter as unknown as OpenRouterService);
  });

  function optionsOf() {
    return openRouter.chat.mock.calls[0]?.[1] as Record<string, unknown>;
  }

  function userPayload() {
    const [messages] = openRouter.chat.mock.calls[0] as [
      Array<{ content: string; role: string }>,
    ];

    return JSON.parse(
      messages.find((message) => message.role === "user")!.content,
    ) as { offer?: unknown; pseudonymisedCvText: string };
  }

  it("returns the four sub-scores and the written advice", async () => {
    const signals = await service.assess(CV_TEXT);

    expect(signals).toEqual(VALID);
  });

  describe("the request it makes", () => {
    it("asks for the strict schema, at temperature zero, under the token cap", async () => {
      await service.assess(CV_TEXT);
      const options = optionsOf();

      expect(options.temperature).toBe(0);
      expect(options.maxTokens).toBeLessThanOrEqual(700);
      expect(options.responseFormat).toMatchObject({
        json_schema: { strict: true },
        type: "json_schema",
      });
    });

    it("requires a provider that honours the schema", async () => {
      await service.assess(CV_TEXT);

      expect(optionsOf().provider).toMatchObject({ require_parameters: true });
    });

    /** The last checkpoint before the data leaves the building (vision §15.3). */
    it("pseudonymises the CV before sending it", async () => {
      await service.assess(CV_TEXT);
      const { pseudonymisedCvText } = userPayload();

      expect(pseudonymisedCvText).not.toContain("jean.dupont@example.com");
      expect(pseudonymisedCvText).not.toContain("+33 6 12 34 56 78");
      expect(pseudonymisedCvText).not.toContain("Dupont");
    });

    it("passes the offer when there is one", async () => {
      await service.assess(CV_TEXT, OFFER);

      expect(userPayload().offer).toMatchObject({ title: "Ingénieur plateforme" });
    });

    /** An empty offer would invite the model to invent a target role. */
    it("omits the offer entirely when there is none", async () => {
      await service.assess(CV_TEXT);

      expect(userPayload()).not.toHaveProperty("offer");
    });

    it("bounds how much text it sends", async () => {
      await service.assess("a".repeat(50_000));

      expect(userPayload().pseudonymisedCvText.length).toBeLessThanOrEqual(
        12_000,
      );
    });
  });

  /**
   * Scoring is free and must never be the reason a generation or a public scan
   * fails: every failure path returns null and the caller falls back to rules.
   */
  describe("when the answer is unusable", () => {
    it("returns null rather than throwing when the provider fails", async () => {
      openRouter.chat.mockRejectedValue(new Error("503 from provider"));

      await expect(service.assess(CV_TEXT)).resolves.toBeNull();
    });

    it("returns null on truncated JSON", async () => {
      openRouter.chat.mockResolvedValue('{"actionVerbs": 8, "quantif');

      expect(await service.assess(CV_TEXT)).toBeNull();
    });

    it("returns null when a sub-score is missing", async () => {
      openRouter.chat.mockResolvedValue(
        JSON.stringify({ ...VALID, relevance: undefined }),
      );

      expect(await service.assess(CV_TEXT)).toBeNull();
    });

    it("rejects an out-of-range sub-score rather than clamping it", async () => {
      openRouter.chat.mockResolvedValue(
        JSON.stringify({ ...VALID, actionVerbs: 42 }),
      );

      expect(await service.assess(CV_TEXT)).toBeNull();
    });

    it("rejects a negative sub-score", async () => {
      openRouter.chat.mockResolvedValue(
        JSON.stringify({ ...VALID, consistency: -1 }),
      );

      expect(await service.assess(CV_TEXT)).toBeNull();
    });

    it("rejects a sub-score sent as a string", async () => {
      openRouter.chat.mockResolvedValue(
        JSON.stringify({ ...VALID, quantification: "7" }),
      );

      expect(await service.assess(CV_TEXT)).toBeNull();
    });

    it("rejects a sub-score that is not a finite number", async () => {
      openRouter.chat.mockResolvedValue(
        '{"actionVerbs":null,"consistency":6,"quantification":7,"relevance":9,"highlights":[],"improvements":[]}',
      );

      expect(await service.assess(CV_TEXT)).toBeNull();
    });
  });

  describe("the advice it keeps", () => {
    it("rounds a fractional sub-score", async () => {
      openRouter.chat.mockResolvedValue(
        JSON.stringify({ ...VALID, actionVerbs: 7.6 }),
      );

      expect((await service.assess(CV_TEXT))?.actionVerbs).toBe(8);
    });

    it("drops blank entries and caps the lists", async () => {
      openRouter.chat.mockResolvedValue(
        JSON.stringify({
          ...VALID,
          highlights: ["Un", "   ", "Deux", "Trois", "Quatre"],
          improvements: [],
        }),
      );

      const signals = await service.assess(CV_TEXT);

      expect(signals?.highlights).toEqual(["Un", "Deux", "Trois"]);
      expect(signals?.improvements).toEqual([]);
    });

    it("tolerates advice that is not an array at all", async () => {
      openRouter.chat.mockResolvedValue(
        JSON.stringify({ ...VALID, highlights: "un point fort" }),
      );

      expect((await service.assess(CV_TEXT))?.highlights).toEqual([]);
    });

    it("ignores non-string entries inside the lists", async () => {
      openRouter.chat.mockResolvedValue(
        JSON.stringify({ ...VALID, improvements: ["Quantifiez.", 42, null] }),
      );

      expect((await service.assess(CV_TEXT))?.improvements).toEqual([
        "Quantifiez.",
      ]);
    });
  });
});
