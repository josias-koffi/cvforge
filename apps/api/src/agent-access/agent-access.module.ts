import { Module } from "@nestjs/common";
import { ApplicationsModule } from "../applications/applications.module";
import { resolveAuthConfig } from "../auth/auth.config";
import { AuthModule } from "../auth/auth.module";
import { AuthService } from "../auth/auth.service";
import { CreditsModule } from "../credits/credits.module";
import { CvGenerationModule } from "../cv-generation/cv-generation.module";
import { DATABASE, type Database } from "../database/database.types";
import { JobSearchModule } from "../job-search/job-search.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProfilesModule } from "../profiles/profiles.module";
import { RateLimitModule } from "../shared/rate-limit/rate-limit.module";
import {
  RATE_LIMIT_STORE,
  type RateLimitStore,
} from "../shared/rate-limit/rate-limit.types";
import { AgentCallLogPurge } from "./agent-call-log-purge";
import { AgentTokensController } from "./agent-tokens.controller";
import {
  AGENT_TOKENS_STORE,
  PgAgentTokensStore,
  type AgentTokensStore,
} from "./agent-tokens.pg-store";
import { AgentTokensService } from "./agent-tokens.service";
import { McpFilesController } from "./mcp/mcp-files.controller";
import { McpController } from "./mcp/mcp.controller";
import { SignedFiles } from "./mcp/signed-files";
import {
  McpRequestGate,
  resolveMcpAllowedOrigins,
} from "./mcp/mcp-request-gate";
import { mcpToolsProvider } from "./mcp/mcp-tools.provider";
import { fetchPublicPage } from "../shared/safe-fetch";
import { OAuthClients } from "./oauth/oauth-clients";
import { OAuthController } from "./oauth/oauth.controller";
import {
  OAUTH_CONFIG,
  resolveOAuthConfig,
  type OAuthConfig,
} from "./oauth/oauth.config";
import {
  OAUTH_STORE,
  PgOAuthStore,
  type OAuthStore,
} from "./oauth/oauth.pg-store";
import { OAuthService } from "./oauth/oauth.service";

/** Client metadata documents are small JSON files on a public host. */
const CIMD_FETCH = {
  accept: "application/json",
  maxBytes: 64 * 1024,
  timeoutMs: 5_000,
};

@Module({
  imports: [
    ApplicationsModule,
    AuthModule,
    CreditsModule,
    CvGenerationModule,
    JobSearchModule,
    NotificationsModule,
    ProfilesModule,
    RateLimitModule,
  ],
  controllers: [
    AgentTokensController,
    McpController,
    McpFilesController,
    OAuthController,
  ],
  providers: [
    {
      provide: AGENT_TOKENS_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgAgentTokensStore(db),
    },
    {
      provide: OAUTH_CONFIG,
      useFactory: () => resolveOAuthConfig(process.env),
    },
    {
      provide: OAUTH_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgOAuthStore(db),
    },
    {
      provide: OAuthClients,
      inject: [OAUTH_STORE],
      useFactory: (store: OAuthStore) =>
        new OAuthClients(store, (url) => fetchPublicPage(url, CIMD_FETCH)),
    },
    {
      provide: OAuthService,
      inject: [OAUTH_CONFIG, OAuthClients, OAUTH_STORE],
      useFactory: (
        config: OAuthConfig,
        clients: OAuthClients,
        store: OAuthStore,
      ) => new OAuthService(config, clients, store),
    },
    {
      provide: AgentCallLogPurge,
      inject: [AGENT_TOKENS_STORE, OAUTH_STORE],
      useFactory: (store: AgentTokensStore, oauth: OAuthStore) =>
        new AgentCallLogPurge(store, oauth),
    },
    {
      provide: AgentTokensService,
      inject: [AGENT_TOKENS_STORE, AuthService],
      useFactory: (store: AgentTokensStore, authService: AuthService) =>
        new AgentTokensService(store, authService),
    },
    {
      provide: McpRequestGate,
      inject: [AgentTokensService, RATE_LIMIT_STORE],
      useFactory: (tokens: AgentTokensService, store: RateLimitStore) =>
        new McpRequestGate(
          tokens,
          store,
          resolveMcpAllowedOrigins(process.env),
        ),
    },
    {
      provide: SignedFiles,
      useFactory: () => {
        const auth = resolveAuthConfig(process.env);
        return new SignedFiles(auth.sessionSecret, auth.apiUrl);
      },
    },
    mcpToolsProvider,
  ],
  exports: [AgentTokensService],
})
export class AgentAccessModule {}
