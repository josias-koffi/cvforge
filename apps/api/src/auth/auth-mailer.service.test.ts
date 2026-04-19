import {
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthMailerService } from "./auth-mailer.service";
import type { SmtpConfig } from "../smtp/smtp.config";

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
      "hello@example.com",
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
      "hello@example.com",
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
      null,
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
      null,
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
    const service = new AuthMailerService(enabledSmtpConfig, "hello@example.com", {
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
        subject: "Votre lien de connexion CVforge",
        to: "user@example.com",
      }),
    );
  });

  it("should wrap transport failures", async () => {
    const service = new AuthMailerService(enabledSmtpConfig, "hello@example.com", {
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
