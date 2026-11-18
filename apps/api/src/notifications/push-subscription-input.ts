import type { PushSubscriptionInput } from "@cvforge/types";

/** Push service addresses and keys are short; anything longer is not one. */
const MAX_ENDPOINT_LENGTH = 2048;
const MAX_KEY_LENGTH = 256;

/**
 * Reads a browser's `PushSubscription.toJSON()`. Only an https endpoint is
 * kept: the API posts to it, so it must never point at a plain-http or
 * internal address.
 */
export function readPushSubscription(
  body: unknown,
): PushSubscriptionInput | null {
  const candidate = body as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  } | null;
  const endpoint = candidate?.endpoint;
  const p256dh = candidate?.keys?.p256dh;
  const auth = candidate?.keys?.auth;

  if (
    typeof endpoint !== "string" ||
    typeof p256dh !== "string" ||
    typeof auth !== "string" ||
    endpoint.length > MAX_ENDPOINT_LENGTH ||
    p256dh.length > MAX_KEY_LENGTH ||
    auth.length > MAX_KEY_LENGTH ||
    !isPublicHttpsUrl(endpoint)
  ) {
    return null;
  }

  return { endpoint, keys: { auth, p256dh } };
}

function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname;

    return (
      url.protocol === "https:" &&
      host.includes(".") &&
      !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(
        host,
      )
    );
  } catch {
    return false;
  }
}
