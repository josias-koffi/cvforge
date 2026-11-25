import {
  AGENT_TOKEN_DEFAULT_DAILY_CREDIT_CAP,
  AGENT_TOKEN_DEFAULT_TTL_DAYS,
  AGENT_TOKEN_MAX_DAILY_CREDIT_CAP,
  AGENT_TOKEN_MAX_TTL_DAYS,
  AGENT_TOKEN_NAME_MAX_LENGTH,
  isAgentScope,
  type AgentTokenCreateRequest,
} from "@cvforge/types";

function readInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  if (value === undefined) {
    return fallback;
  }

  return Number.isInteger(value) &&
    (value as number) >= min &&
    (value as number) <= max
    ? (value as number)
    : null;
}

/** Reads a token creation request; returns an error message when invalid. */
export function readAgentTokenCreateRequest(
  body: unknown,
): AgentTokenCreateRequest | string {
  const candidate = (body ?? {}) as Record<string, unknown>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";

  if (!name || name.length > AGENT_TOKEN_NAME_MAX_LENGTH) {
    return `Donnez un nom au jeton (${AGENT_TOKEN_NAME_MAX_LENGTH} caractères au plus).`;
  }

  const scopes = Array.isArray(candidate.scopes) ? candidate.scopes : [];

  if (scopes.length === 0 || !scopes.every(isAgentScope)) {
    return "Choisissez au moins une permission valide.";
  }

  const ttlDays = readInteger(
    candidate.ttlDays,
    AGENT_TOKEN_DEFAULT_TTL_DAYS,
    1,
    AGENT_TOKEN_MAX_TTL_DAYS,
  );

  if (ttlDays === null) {
    return `La durée de validité va de 1 à ${AGENT_TOKEN_MAX_TTL_DAYS} jours.`;
  }

  const dailyCreditCap = readInteger(
    candidate.dailyCreditCap,
    AGENT_TOKEN_DEFAULT_DAILY_CREDIT_CAP,
    0,
    AGENT_TOKEN_MAX_DAILY_CREDIT_CAP,
  );

  if (dailyCreditCap === null) {
    return `Le plafond va de 0 à ${AGENT_TOKEN_MAX_DAILY_CREDIT_CAP} crédits par jour.`;
  }

  return { dailyCreditCap, name, scopes: [...new Set(scopes)], ttlDays };
}
