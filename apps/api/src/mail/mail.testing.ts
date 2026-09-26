import type { MailConfig } from "./mail.config";

/** A complete mail config for tests; `from: null` means EMAIL_FROM unset. */
export function testMailConfig(overrides: Partial<MailConfig> = {}): MailConfig {
  return {
    appUrl: "https://app.cvspark.test",
    from: "CVSpark <no-reply@cvspark.test>",
    landingUrl: "https://cvspark.test",
    replyTo: "support@cvspark.test",
    supportEmail: "support@cvspark.test",
    ...overrides,
  };
}
