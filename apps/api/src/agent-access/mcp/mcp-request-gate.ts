import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  PayloadTooLargeException,
  UnauthorizedException,
} from "@nestjs/common";
import type { RateLimitStore } from "../../shared/rate-limit/rate-limit.types";
import type {
  AgentPrincipal,
  AgentTokensService,
} from "../agent-tokens.service";

export const MCP_MAX_BODY_BYTES = 1024 * 1024;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
export const MCP_CALLS_PER_MINUTE = 60;
export const MCP_CALLS_PER_DAY = 1000;

export type McpRequestHeaders = {
  authorization?: string;
  origin?: string;
  "content-length"?: string;
};

/** `MCP_ALLOWED_ORIGINS`: comma-separated, e.g. `chrome-extension://abc…` (ADR-032). */
export function resolveMcpAllowedOrigins(env: NodeJS.ProcessEnv) {
  return (env.MCP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Everything checked before a JSON-RPC message is read: origin (a browser
 * page must not reach `/mcp` with a token it was tricked into using), size,
 * token, then the per-token call budget.
 */
export class McpRequestGate {
  constructor(
    private readonly tokens: Pick<AgentTokensService, "authenticate">,
    private readonly rateLimits: RateLimitStore,
    private readonly allowedOrigins: readonly string[],
    private readonly clock: () => number = () => Date.now(),
  ) {}

  async admit(headers: McpRequestHeaders): Promise<AgentPrincipal> {
    if (headers.origin && !this.allowedOrigins.includes(headers.origin)) {
      throw new ForbiddenException("Origine non autorisée.");
    }

    if (Number(headers["content-length"] ?? 0) > MCP_MAX_BODY_BYTES) {
      throw new PayloadTooLargeException("Requête trop volumineuse.");
    }

    const bearer = /^Bearer\s+(\S+)$/i.exec(headers.authorization ?? "")?.[1];
    const principal = await this.tokens.authenticate(bearer);

    if (!principal) {
      throw new UnauthorizedException(
        "Jeton d'agent JobSpark manquant, expiré ou révoqué.",
      );
    }

    this.meter(principal.tokenId);

    return principal;
  }

  private meter(tokenId: string) {
    const now = this.clock();
    const key = `mcp:${tokenId}`;

    this.rateLimits.prune(now - DAY_MS);

    if (
      this.rateLimits.count(key, MINUTE_MS, now) >= MCP_CALLS_PER_MINUTE ||
      this.rateLimits.count(key, DAY_MS, now) >= MCP_CALLS_PER_DAY
    ) {
      throw new HttpException(
        "Trop d'appels pour ce jeton, réessayez dans une minute.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.rateLimits.record(key, now);
  }
}
