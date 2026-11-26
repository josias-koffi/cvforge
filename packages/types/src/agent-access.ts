/**
 * Personal agent tokens (ADR-032): a candidate lets their own agent (Claude
 * Code, through the MCP server at `/mcp`) act on their account, within the
 * scopes and the daily credit cap they chose.
 */

export const AGENT_SCOPES = [
  "profile:read",
  "profile:write",
  "jobs:read",
  "applications:read",
  "applications:write",
  "documents:generate",
  "notifications:read",
  "credits:read",
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];

export const AGENT_SCOPE_LABELS: Record<AgentScope, string> = {
  "applications:read": "Voir mes candidatures, CV et lettres",
  "applications:write": "Créer des candidatures et changer leur statut",
  "credits:read": "Voir mon solde et l'historique de crédits",
  "documents:generate":
    "Générer CV, lettres et analyses d'offre (dépense des crédits)",
  "jobs:read": "Voir les offres, les offres du jour et la recherche",
  "notifications:read": "Voir mes alertes et les marquer comme lues",
  "profile:read": "Lire mon profil (dont nom, e-mail, téléphone)",
  "profile:write": "Modifier mon profil",
};

export const AGENT_SCOPE_PRESETS = {
  assistant: [...AGENT_SCOPES],
  /**
   * The JobSpark Chrome extension (E33, ADR-034) acts inside third-party
   * pages, exposed to prompt injection: no profile writes. It reads the
   * balance to announce a cost before spending.
   */
  extension: [
    "profile:read",
    "jobs:read",
    "applications:read",
    "applications:write",
    "documents:generate",
    "credits:read",
  ],
  readOnly: [
    "profile:read",
    "jobs:read",
    "applications:read",
    "notifications:read",
    "credits:read",
  ],
} satisfies Record<string, AgentScope[]>;

export type AgentScopePreset = keyof typeof AGENT_SCOPE_PRESETS;

/**
 * The narrowest preset that covers what an agent asked for, so a consent
 * screen never starts by offering more than the request (full access when
 * nothing narrower fits, or when nothing was asked).
 */
export function closestAgentScopePreset(
  requested: readonly string[],
): AgentScopePreset {
  if (requested.length === 0) return "assistant";

  const covering = (Object.keys(AGENT_SCOPE_PRESETS) as AgentScopePreset[])
    .filter((preset) =>
      requested.every((scope) =>
        (AGENT_SCOPE_PRESETS[preset] as readonly string[]).includes(scope),
      ),
    )
    .sort(
      (a, b) => AGENT_SCOPE_PRESETS[a].length - AGENT_SCOPE_PRESETS[b].length,
    );

  return covering[0] ?? "assistant";
}

export const AGENT_TOKEN_PREFIX = "jsk_";
export const AGENT_TOKEN_MAX_ACTIVE = 10;
export const AGENT_TOKEN_DEFAULT_TTL_DAYS = 30;
export const AGENT_TOKEN_MAX_TTL_DAYS = 90;
export const AGENT_TOKEN_DEFAULT_DAILY_CREDIT_CAP = 20;
export const AGENT_TOKEN_MAX_DAILY_CREDIT_CAP = 200;
export const AGENT_TOKEN_NAME_MAX_LENGTH = 60;

export type AgentTokenSummary = {
  id: string;
  name: string;
  /** The last 4 characters, to recognise a token without storing it. */
  lastFour: string;
  scopes: AgentScope[];
  dailyCreditCap: number;
  /** Credits spent today (UTC) through this token. */
  creditsSpentToday: number;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  status: "active" | "expired" | "revoked";
  /** "oauth": granted from an agent's consent screen (ADR-033), not pasted. */
  source: "personal" | "oauth";
};

/** What the consent page shows about a pending OAuth authorization. */
export type OAuthConsentRequest = {
  clientName: string;
  /** Where the browser goes back to, as the user should check it. */
  redirectHost: string;
  /** "cimd": the client is known by its published metadata; "dcr": it registered itself. */
  clientKind: "cimd" | "dcr";
  requestedScopes: AgentScope[];
};

export type OAuthConsentDecision = {
  request: string;
  approve: boolean;
  scopes?: AgentScope[];
  dailyCreditCap?: number;
};

export type AgentTokenCreateRequest = {
  name: string;
  scopes: AgentScope[];
  ttlDays: number;
  dailyCreditCap: number;
};

/** The only response that ever carries the raw token. */
export type AgentTokenCreateResponse = {
  token: string;
  summary: AgentTokenSummary;
};

export type AgentToolCallOutcome = "ok" | "error" | "denied";

export type AgentToolCall = {
  id: string;
  tokenId: string;
  tokenName: string;
  tool: string;
  outcome: AgentToolCallOutcome;
  creditsSpent: number;
  durationMs: number;
  createdAt: string;
};

export function isAgentScope(value: unknown): value is AgentScope {
  return (
    typeof value === "string" &&
    (AGENT_SCOPES as readonly string[]).includes(value)
  );
}
