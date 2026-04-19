import { describe, expect, it } from "vitest";
import { createSmtpConfig } from "./smtp.config";

describe("createSmtpConfig", () => {
  it("should return a disabled config when no SMTP env is set", () => {
    expect(createSmtpConfig({})).toEqual({
      enabled: false,
      provider: null,
      server: null,
      port: null,
      user: null,
      password: null,
    });
  });

  it("should build an enabled config from SMTP env variables", () => {
    expect(
      createSmtpConfig({
        SMTP_PROVIDER: "resend",
        SMTP_SERVER: "smtp.resend.com",
        SMTP_PORT: "587",
        SMTP_USER: "resend",
        SMTP_PASSWORD: "secret",
      }),
    ).toEqual({
      enabled: true,
      provider: "resend",
      server: "smtp.resend.com",
      port: 587,
      user: "resend",
      password: "secret",
    });
  });

  it("should accept SMTP_HOST as a fallback alias for SMTP_SERVER", () => {
    expect(
      createSmtpConfig({
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "2525",
        SMTP_USER: "mailer",
        SMTP_PASSWORD: "secret",
      }),
    ).toMatchObject({
      enabled: true,
      server: "smtp.example.com",
      port: 2525,
    });
  });

  it("should reject partial SMTP configuration", () => {
    expect(() =>
      createSmtpConfig({
        SMTP_SERVER: "smtp.example.com",
      }),
    ).toThrowError(
      "Incomplete SMTP configuration. Missing: SMTP_PORT, SMTP_USER, SMTP_PASSWORD.",
    );
  });

  it("should reject a non-numeric port", () => {
    expect(() =>
      createSmtpConfig({
        SMTP_SERVER: "smtp.example.com",
        SMTP_PORT: "abc",
        SMTP_USER: "mailer",
        SMTP_PASSWORD: "secret",
      }),
    ).toThrowError("SMTP_PORT must be a positive integer.");
  });
});
