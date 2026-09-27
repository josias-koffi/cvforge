import type { AuthConfig } from "./auth.types";

type LinkConfig = Pick<AuthConfig, "apiUrl" | "appUrl">;

/**
 * The link sent by email: redeemed by the API, which then redirects to the
 * app's `/login/success`. `nextPath`, when a free tool's intent names a
 * screen, is passed along for the app to open instead of the dashboard.
 */
export function buildMagicLink(
  config: LinkConfig,
  token: string,
  nextPath: string | null = null,
) {
  const loginSuccessUrl = new URL("/login/success", config.appUrl);
  const consumeUrl = new URL("/auth/passwordless/consume", config.apiUrl);

  if (nextPath) {
    loginSuccessUrl.searchParams.set("next", nextPath);
  }

  consumeUrl.searchParams.set("token", token);
  consumeUrl.searchParams.set("redirectTo", loginSuccessUrl.toString());

  return consumeUrl.toString();
}

/** Only the app's own origin: anything else lands on `/login`. */
export function normalizeRedirectTarget(
  config: LinkConfig,
  redirectTo?: string,
) {
  if (!redirectTo) {
    return new URL("/login/success", config.appUrl).toString();
  }

  const allowedOrigin = new URL(config.appUrl).origin;

  try {
    const candidate = new URL(redirectTo, config.appUrl);

    if (candidate.origin !== allowedOrigin) {
      return new URL("/login", config.appUrl).toString();
    }

    return candidate.toString();
  } catch {
    return new URL("/login", config.appUrl).toString();
  }
}
