import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadCaptureService } from "../leads/lead-capture.service";
import { PublicKeywordMatchController } from "./keyword-match.controller";
import type { KeywordMatchService } from "./keyword-match.service";

const OFFER =
  "Developpeuse backend TypeScript, API Node.js et PostgreSQL. ".repeat(5);

describe("PublicKeywordMatchController — lead", () => {
  let requestMagicLink: ReturnType<typeof vi.fn>;
  let sendMagicLinkEmail: ReturnType<typeof vi.fn>;
  let controller: PublicKeywordMatchController;

  beforeEach(() => {
    requestMagicLink = vi.fn().mockResolvedValue({ magicLink: "x" });
    sendMagicLinkEmail = vi.fn().mockResolvedValue(undefined);
    controller = new PublicKeywordMatchController(
      {} as KeywordMatchService,
      new LeadCaptureService(
        { requestMagicLink } as never,
        { sendMagicLinkEmail } as never,
      ),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("sends a magic link carrying the offer", async () => {
    await expect(
      controller.lead({
        consentAccepted: true,
        email: " Lead@Example.com ",
        offerText: OFFER,
      }),
    ).resolves.toEqual({ magicLinkSent: true });

    expect(requestMagicLink).toHaveBeenCalledWith("lead@example.com", true, {
      kind: "offer",
      offerText: OFFER.trim(),
    });
    expect(sendMagicLinkEmail).toHaveBeenCalledTimes(1);
  });

  /** No enumeration: a suspended account answers like any other address. */
  it("answers the same when the link cannot be sent", async () => {
    requestMagicLink.mockRejectedValue(new Error("suspended"));

    await expect(
      controller.lead({
        consentAccepted: true,
        email: "a@b.fr",
        offerText: OFFER,
      }),
    ).resolves.toEqual({ magicLinkSent: true });
  });

  it.each([
    [
      { consentAccepted: true, email: "nope", offerText: OFFER },
      "INVALID_EMAIL",
    ],
    [
      { consentAccepted: false, email: "a@b.fr", offerText: OFFER },
      "CONSENT_REQUIRED",
    ],
    [
      { consentAccepted: true, email: "a@b.fr", offerText: "court" },
      "OFFER_TEXT_REQUIRED",
    ],
  ])("refuses %j with %s and sends nothing", async (body, code) => {
    await expect(controller.lead(body)).rejects.toMatchObject({
      response: { code },
    });
    expect(requestMagicLink).not.toHaveBeenCalled();
  });
});

describe("PublicKeywordMatchController — match", () => {
  it("hands the upload and the offer to the matcher", async () => {
    const result = { coverage: 50 };
    const match = vi.fn().mockResolvedValue(result);
    const controller = new PublicKeywordMatchController(
      { match } as unknown as KeywordMatchService,
      {} as LeadCaptureService,
    );
    const file = { buffer: Buffer.from("%PDF-"), size: 5 } as never;

    await expect(controller.match(file, { offerText: OFFER })).resolves.toBe(
      result,
    );
    expect(match).toHaveBeenCalledWith({ file, offerText: OFFER });
  });
});
