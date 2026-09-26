export const MAIL_CONFIG = Symbol("MAIL_CONFIG");

const DEFAULT_APP_URL = "http://localhost:3000";
const DEFAULT_LANDING_URL = "http://localhost:3101";
const DEFAULT_SUPPORT_EMAIL = "support@jobspark.koklo.dev";

/**
 * What every e-mail needs besides its own content: who sends it, where a
 * reply lands, and the addresses the header and the footer point to.
 */
export type MailConfig = {
  /** `EMAIL_FROM`, name and address together. Null: nothing can be sent. */
  from: string | null;
  /** `EMAIL_REPLY_TO`: a reply to no-reply@ reaches a person instead. */
  replyTo: string | null;
  appUrl: string;
  /** The landing serves the logo and the legal documents. */
  landingUrl: string;
  supportEmail: string;
};

function readOptional(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function normalizeUrl(value: string | undefined, fallback: string) {
  const raw = readOptional(value);

  return raw ? new URL(raw).toString().replace(/\/$/, "") : fallback;
}

export function resolveMailConfig(env: NodeJS.ProcessEnv): MailConfig {
  const replyTo = readOptional(env.EMAIL_REPLY_TO);

  return {
    appUrl: normalizeUrl(env.NEXT_PUBLIC_APP_URL, DEFAULT_APP_URL),
    from: readOptional(env.EMAIL_FROM),
    landingUrl: normalizeUrl(env.LANDING_URL, DEFAULT_LANDING_URL),
    replyTo,
    // The footer names the address a reply goes to, so both stay the same.
    supportEmail: replyTo ? extractAddress(replyTo) : DEFAULT_SUPPORT_EMAIL,
  };
}

/** `Jobspark <support@x>` → `support@x`; a bare address is returned as is. */
function extractAddress(value: string) {
  return /<([^>]+)>/.exec(value)?.[1]?.trim() ?? value;
}
