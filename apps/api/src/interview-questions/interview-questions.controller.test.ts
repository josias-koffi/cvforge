import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadCaptureService } from "../leads/lead-capture.service";
import { PublicInterviewQuestionsController } from "./interview-questions.controller";
import type { InterviewQuestionsService } from "./interview-questions.service";

const OFFER =
  "Chef de projet digital, refonte e-commerce, Scrum et Jira. ".repeat(5);

describe("PublicInterviewQuestionsController", () => {
  let generate: ReturnType<typeof vi.fn>;
  let requestMagicLink: ReturnType<typeof vi.fn>;
  let sendMagicLinkEmail: ReturnType<typeof vi.fn>;
  let controller: PublicInterviewQuestionsController;

  beforeEach(() => {
    generate = vi.fn().mockResolvedValue({ questions: [] });
    requestMagicLink = vi.fn().mockResolvedValue({ magicLink: "x" });
    sendMagicLinkEmail = vi.fn().mockResolvedValue(undefined);
    controller = new PublicInterviewQuestionsController(
      { generate } as unknown as InterviewQuestionsService,
      new LeadCaptureService(
        { requestMagicLink } as never,
        { sendMagicLinkEmail } as never,
      ),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("hands the offer and the page's language to the service", async () => {
    await controller.generate({ locale: "en", offerText: OFFER });

    expect(generate).toHaveBeenCalledWith({ locale: "en", offerText: OFFER });
  });

  it("sends a magic link that opens an interview on the offer", async () => {
    await expect(
      controller.lead({
        consentAccepted: true,
        email: " Lead@Example.com ",
        offerText: OFFER,
      }),
    ).resolves.toEqual({ magicLinkSent: true });

    expect(requestMagicLink).toHaveBeenCalledWith("lead@example.com", true, {
      kind: "interview",
      offerText: OFFER.trim(),
    });
    expect(sendMagicLinkEmail).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "no consent",
      { consentAccepted: false, email: "a@b.fr", offerText: OFFER },
      "CONSENT_REQUIRED",
    ],
    [
      "a bad address",
      { consentAccepted: true, email: "nope", offerText: OFFER },
      "INVALID_EMAIL",
    ],
    [
      "no offer",
      { consentAccepted: true, email: "a@b.fr" },
      "OFFER_TEXT_REQUIRED",
    ],
  ])("refuses a lead with %s, sending nothing", async (_label, body, code) => {
    await expect(controller.lead(body)).rejects.toMatchObject({
      response: expect.objectContaining({ code }),
    });
    expect(requestMagicLink).not.toHaveBeenCalled();
  });
});
