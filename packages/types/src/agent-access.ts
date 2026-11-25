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
   * The future JobSpark Chrome extension (E33) acts inside third-party pages,
   * exposed to prompt injection: no profile writes.
   */
  extension: [
    "profile:read",
    "jobs:read",
    "applications:read",
    "applications:write",
    "documents:generate",
  ],
  readOnly: [
    "profile:read",
    "jobs:read",
    "applications:read",
    "notifications:read",
    "credits:read",
  ],
} satisfies Record<string, AgentScope[]>;

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
