import { resolve } from "node:path";
import type { AuthConfig } from "./auth.types";

const DEFAULT_API_URL = "http://localhost:3333";
const DEFAULT_APP_URL = "http://localhost:3000";
const DEFAULT_MAGIC_LINK_TTL_MINUTES = 15;
const DEFAULT_SESSION_TTL_DAYS = 7;
const DEFAULT_COOKIE_NAME = "cvforge_session";
const DEFAULT_DEV_SECRET = "cvforge-dev-session-secret-change-me";
const DEFAULT_STATE_FILE = resolve(process.cwd(), ".data", "auth-state.json");

function parsePositiveInt(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizeUrl(rawValue: string | undefined, fallback: string) {
  const value = rawValue?.trim();

  if (!value) {
    return fallback;
  }

  return new URL(value).toString().replace(/\/$/, "");
}

export function resolveAuthConfig(
  env: NodeJS.ProcessEnv,
): AuthConfig {
  const apiUrl = normalizeUrl(env.NEXT_PUBLIC_API_URL, DEFAULT_API_URL);
  const appUrl = normalizeUrl(env.NEXT_PUBLIC_APP_URL, DEFAULT_APP_URL);
  const sessionSecret =
    env.AUTH_SESSION_SECRET?.trim() ||
    (env.NODE_ENV === "production" ? "" : DEFAULT_DEV_SECRET);

  if (!sessionSecret) {
    throw new Error(
      "AUTH_SESSION_SECRET is required in production to sign auth sessions.",
    );
  }

  return {
    apiUrl,
    appUrl,
    cookieDomain: env.COOKIE_DOMAIN?.trim() || undefined,
    magicLinkTtlMinutes: parsePositiveInt(
      env.AUTH_MAGIC_LINK_TTL_MINUTES,
      DEFAULT_MAGIC_LINK_TTL_MINUTES,
    ),
    sessionTtlDays: parsePositiveInt(
      env.AUTH_SESSION_TTL_DAYS,
      DEFAULT_SESSION_TTL_DAYS,
    ),
    cookieName: env.AUTH_COOKIE_NAME?.trim() || DEFAULT_COOKIE_NAME,
    sessionSecret,
    secureCookies: appUrl.startsWith("https://"),
    stateFilePath: env.AUTH_STATE_FILE?.trim() || DEFAULT_STATE_FILE,
  };
}
