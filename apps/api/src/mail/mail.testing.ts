import type { MailConfig } from "./mail.config";

/** A complete mail config for tests; `from: null` means EMAIL_FROM unset. */
export function testMailConfig(overrides: Partial<MailConfig> = {}): MailConfig {
  return {
    appUrl: "https://app.jobspark.test",
    from: "Jobspark <no-reply@jobspark.test>",
    landingUrl: "https://jobspark.test",
    replyTo: "support@jobspark.test",
    supportEmail: "support@jobspark.test",
    ...overrides,
  };
}
