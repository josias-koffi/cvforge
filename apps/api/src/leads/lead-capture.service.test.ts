import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthMailerService } from "../auth/auth-mailer.service";
import type { AuthService } from "../auth/auth.service";
import {
  CONSENT_REQUIRED_MESSAGE,
  INVALID_EMAIL_MESSAGE,
  LeadCaptureService,
} from "./lead-capture.service";

const INTENT = {
  kind: "ats_scan",
  scanId: "3f2b8c1e-5d4a-4b6f-9a8e-1c2d3e4f5a6b",
} as const;

describe("LeadCaptureService", () => {
  let requestMagicLink: ReturnType<typeof vi.fn>;
  let sendMagicLinkEmail: ReturnType<typeof vi.fn>;
  let service: LeadCaptureService;

  beforeEach(() => {
    requestMagicLink = vi.fn().mockResolvedValue({ magicLink: "https://x" });
    sendMagicLinkEmail = vi.fn().mockResolvedValue(undefined);
    service = new LeadCaptureService(
      { requestMagicLink } as unknown as AuthService,
      { sendMagicLinkEmail } as unknown as AuthMailerService,
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  describe("acceptedEmail", () => {
    it("normalises the address", () => {
      expect(
        service.acceptedEmail({
          consentAccepted: true,
          email: "  Lead@Example.COM ",
        }),
      ).toBe("lead@example.com");
    });

    it.each([
      [
        "a malformed address",
        { consentAccepted: true, email: "lead@" },
        "INVALID_EMAIL",
        INVALID_EMAIL_MESSAGE,
      ],
      [
        "a missing address",
        { consentAccepted: true, email: 42 },
        "INVALID_EMAIL",
        INVALID_EMAIL_MESSAGE,
      ],
      [
        "no consent",
        { consentAccepted: false, email: "lead@example.com" },
        "CONSENT_REQUIRED",
        CONSENT_REQUIRED_MESSAGE,
      ],
      [
        "a truthy consent that is not true",
        { consentAccepted: "yes", email: "lead@example.com" },
        "CONSENT_REQUIRED",
        CONSENT_REQUIRED_MESSAGE,
      ],
    ])(
      "refuses %s, with a code the landing translates",
      (_label, request, code, message) => {
        let caught: unknown;

        try {
          service.acceptedEmail(request);
        } catch (error) {
          caught = error;
        }

        expect(caught).toBeInstanceOf(BadRequestException);
        expect((caught as BadRequestException).getResponse()).toEqual({
          code,
          message,
        });
      },
    );
  });

  describe("sendLink", () => {
    it("asks for a link carrying the intent, with consent, and mails it", async () => {
      await service.sendLink("lead@example.com", INTENT);

      expect(requestMagicLink).toHaveBeenCalledWith(
        "lead@example.com",
        true,
        INTENT,
      );
      expect(sendMagicLinkEmail).toHaveBeenCalledWith({
        magicLink: "https://x",
      });
    });

    it("drops an intent that does not pass validation, and still sends a link", async () => {
      await service.sendLink("lead@example.com", {
        kind: "company",
        siren: "not-a-siren",
      });

      expect(requestMagicLink).toHaveBeenCalledWith(
        "lead@example.com",
        true,
        null,
      );
    });

    /** Propagating would tell an anonymous caller whether the account exists. */
    it("swallows a refusal from auth", async () => {
      requestMagicLink.mockRejectedValue(new ForbiddenException());

      await expect(
        service.sendLink("lead@example.com", INTENT),
      ).resolves.toBeUndefined();
      expect(sendMagicLinkEmail).not.toHaveBeenCalled();
    });

    it("swallows a delivery failure", async () => {
      sendMagicLinkEmail.mockRejectedValue(new Error("smtp down"));

      await expect(
        service.sendLink("lead@example.com", INTENT),
      ).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalled();
    });
  });
});
