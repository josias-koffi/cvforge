import {
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthMailerService } from "./auth-mailer.service";
import type { SmtpConfig } from "../smtp/smtp.config";
import { testMailConfig } from "../mail/mail.testing";

const enabledSmtpConfig: SmtpConfig = {
  enabled: true,
  password: "secret",
  port: 587,
  provider: "resend",
  server: "smtp.resend.com",
  user: "resend",
};

describe("AuthMailerService", () => {
  it("should report an unhealthy state when SMTP is disabled", () => {
    const service = new AuthMailerService(
      {
        ...enabledSmtpConfig,
        enabled: false,
      },
      testMailConfig({ from: "hello@example.com" }),
      null,
    );

    expect(service.getHealth()).toEqual({
      emailFromConfigured: true,
      ready: false,
      smtpEnabled: false,
    });
  });

  it("should reject when SMTP is disabled", async () => {
    const service = new AuthMailerService(
      {
        ...enabledSmtpConfig,
        enabled: false,
      },
      testMailConfig({ from: "hello@example.com" }),
      null,
    );

    await expect(
      service.sendMagicLinkEmail({
        email: "user@example.com",
        expiresAt: "2026-04-19T20:34:09.000Z",
        magicLink: "http://localhost:3333/auth/passwordless/consume?token=abc",
        sessionDurationDays: 7,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("should reject startup readiness when EMAIL_FROM is missing", () => {
    const service = new AuthMailerService(
      enabledSmtpConfig,
      testMailConfig({ from: null }),
      {
        sendMail: vi.fn(),
      },
    );

    expect(() => service.assertDeliveryReady()).toThrow(
      /EMAIL_FROM is missing/i,
    );
  });

  it("should reject when EMAIL_FROM is missing", async () => {
    const service = new AuthMailerService(
      enabledSmtpConfig,
      testMailConfig({ from: null }),
      {
        sendMail: vi.fn(),
      },
    );

    await expect(
      service.sendMagicLinkEmail({
        email: "user@example.com",
        expiresAt: "2026-04-19T20:34:09.000Z",
        magicLink: "http://localhost:3333/auth/passwordless/consume?token=abc",
        sessionDurationDays: 7,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("should send the magic-link email when SMTP is configured", async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const service = new AuthMailerService(
      enabledSmtpConfig,
      testMailConfig({ from: "hello@example.com" }),
      {
      sendMail,
    });

    await service.sendMagicLinkEmail({
      email: "user@example.com",
      expiresAt: "2026-04-19T20:34:09.000Z",
      magicLink: "http://localhost:3333/auth/passwordless/consume?token=abc",
      sessionDurationDays: 7,
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "hello@example.com",
        replyTo: "support@cvspark.test",
        subject: "Votre lien de connexion CVSpark",
        to: "user@example.com",
      }),
    );
    const { html, text } = sendMail.mock.calls[0]![0];
    expect(html).toContain(
      'href="http://localhost:3333/auth/passwordless/consume?token=abc"',
    );
    // Paris time, in words, not the raw ISO string.
    expect(text).toContain("19 avril 2026 à 22:34");
    expect(text).not.toContain("2026-04-19T20:34:09.000Z");
  });

  it("tells a free-tool visitor the link reopens their result", async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const service = new AuthMailerService(enabledSmtpConfig, testMailConfig(), {
      sendMail,
    });

    await service.sendMagicLinkEmail({
      email: "lead@example.com",
      expiresAt: "2026-04-19T20:34:09.000Z",
      magicLink: "http://localhost:3333/auth/passwordless/consume?token=abc",
      purpose: "tool-result",
      sessionDurationDays: 7,
    });

    expect(sendMail.mock.calls[0]![0].subject).toBe(
      "Votre résultat CVSpark est prêt",
    );
    expect(sendMail.mock.calls[0]![0].html).toContain("Voir mon résultat");
  });

  it("should wrap transport failures", async () => {
    const service = new AuthMailerService(
      enabledSmtpConfig,
      testMailConfig({ from: "hello@example.com" }),
      {
      sendMail: vi.fn().mockRejectedValue(new Error("smtp failed")),
    });

    await expect(
      service.sendMagicLinkEmail({
        email: "user@example.com",
        expiresAt: "2026-04-19T20:34:09.000Z",
        magicLink: "http://localhost:3333/auth/passwordless/consume?token=abc",
        sessionDurationDays: 7,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
