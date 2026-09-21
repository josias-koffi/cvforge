/**
 * Environment parsing shared by every OpenRouter config (chat, transcription).
 * Kept apart so a second config cannot drift from the blank/`none` convention
 * the first one established.
 */

/** `docker compose` turns an unset `${VAR:-}` into an empty string, so blank
 *  must mean "unset" everywhere, never "no value". */
export function nonEmpty(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Comma-separated model list. Blank falls back to `defaults` (see `nonEmpty`);
 * the literal `none` is the explicit opt-out and yields an empty chain.
 */
export function parseModelList(
  raw: string | undefined,
  defaults: string[],
): string[] {
  const value = nonEmpty(raw);
  if (value === undefined) return defaults;
  if (value.toLowerCase() === "none") return [];

  return value
    .split(",")
    .map((model) => model.trim())
    .filter((model) => model.length > 0);
}

export function parseMaxAttempts(
  raw: string | undefined,
  fallback: number,
): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}
