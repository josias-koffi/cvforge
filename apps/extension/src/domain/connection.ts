import { AGENT_SCOPE_PRESETS } from "@cvforge/types";

/**
 * What the extension asks JobSpark for: the `extension` preset (no profile
 * writes, ADR-034 §4) plus a refresh token to stay connected.
 */
export const EXTENSION_SCOPE = [
  ...AGENT_SCOPE_PRESETS.extension,
  "offline_access",
].join(" ");

/** Default model for the candidate's own key (OpenAI-compatible, ADR-034 §8). */
export const DEFAULT_AI_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_AI_MODEL = "anthropic/claude-haiku-5.5";

export type ConnectionStatus = "disconnected" | "connected" | "revoked";

/** Everything the side panel may know. Never a token, never the AI key. */
export type PanelState = {
  apiHost: string;
  status: ConnectionStatus;
  balance: number | null;
  aiKey: { configured: boolean; hint: string | null; model: string };
};

/** `sk-or-v1-…9f3a`: enough to recognise a key, not to use it. */
export function maskSecret(secret: string): string {
  const trimmed = secret.trim();
  if (trimmed.length <= 8) return "…";
  const prefix = trimmed.match(/^[a-z]+(-[a-z0-9]+)?-/i)?.[0] ?? "";
  return `${prefix}…${trimmed.slice(-4)}`;
}

export class AuthorizationError extends Error {
  constructor(
    readonly reason: "denied" | "state" | "issuer" | "missing-code",
    message: string,
  ) {
    super(message);
  }
}

/**
 * Reads the redirect JobSpark sent back (`https://<id>.chromiumapp.org/?…`):
 * checks the state we sent and the issuer (RFC 9207) before trusting the code.
 */
export function readAuthorizationResponse(
  responseUrl: string,
  expected: { state: string; issuer: string },
): string {
  const params = new URL(responseUrl).searchParams;
  if (params.get("state") !== expected.state) {
    throw new AuthorizationError("state", "Réponse d'autorisation inattendue.");
  }
  const issuer = params.get("iss");
  if (issuer && issuer !== expected.issuer) {
    throw new AuthorizationError("issuer", "Réponse d'un autre serveur.");
  }
  if (params.get("error") === "access_denied") {
    throw new AuthorizationError("denied", "Connexion refusée.");
  }
  const code = params.get("code");
  if (!code) {
    throw new AuthorizationError(
      "missing-code",
      params.get("error_description") ?? "Connexion impossible.",
    );
  }
  return code;
}

const UNTRUSTED_WRAPPER =
  /^\s*<untrusted_offer_content>\s*([\s\S]*?)\s*<\/untrusted_offer_content>\s*$/;

/** A JobSpark MCP tool answers with one JSON text block, maybe wrapped as untrusted. */
export function parseToolJson(result: Record<string, unknown>): unknown {
  const block = Array.isArray(result.content) ? result.content[0] : undefined;
  const text =
    block && typeof block === "object" && "text" in block
      ? String(block.text)
      : "";
  if (result.isError) throw new Error(text || "Outil JobSpark en erreur.");
  return JSON.parse(text.replace(UNTRUSTED_WRAPPER, "$1"));
}

/** The balance out of `get_credit_balance`, or null when the shape is unexpected. */
export function readBalance(payload: unknown): number | null {
  if (payload && typeof payload === "object" && "balance" in payload) {
    const balance = Number(payload.balance);
    return Number.isFinite(balance) ? balance : null;
  }
  return null;
}
