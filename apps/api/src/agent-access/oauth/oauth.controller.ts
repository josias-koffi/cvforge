import type { ServerResponse } from "node:http";
import type { OAuthConsentDecision } from "@cvforge/types";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { AuthService } from "../../auth/auth.service";
import { Public } from "../../auth/public.decorator";
import { requireSession, type CookieRequest } from "../../auth/request-session";
import { OAuthClientError, OAuthClients } from "./oauth-clients";
import { OAUTH_CONFIG, type OAuthConfig } from "./oauth.config";
import {
  authorizationServerMetadata,
  protectedResourceMetadata,
} from "./oauth-metadata";
import { OAuthError, OAuthService } from "./oauth.service";

function send(
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Pragma: "no-cache",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * The authorization server for MCP clients (ADR-033): metadata, authorize,
 * token, register, revoke — public, as the clients call them — and the
 * consent endpoints the web app calls with the user's session.
 */
@Controller()
export class OAuthController {
  constructor(
    @Inject(OAUTH_CONFIG) private readonly config: OAuthConfig,
    @Inject(OAuthService) private readonly oauth: OAuthService,
    @Inject(OAuthClients) private readonly clients: OAuthClients,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Public()
  @Get(".well-known/oauth-protected-resource/mcp")
  resourceMetadata() {
    return protectedResourceMetadata(this.config);
  }

  /** Clients that probe the root path first (RFC 9728 §3.1 fallback). */
  @Public()
  @Get(".well-known/oauth-protected-resource")
  rootResourceMetadata() {
    return protectedResourceMetadata(this.config);
  }

  @Public()
  @Get(".well-known/oauth-authorization-server")
  serverMetadata() {
    return authorizationServerMetadata(this.config);
  }

  @Public()
  @Get("oauth/authorize")
  async authorize(
    @Query() query: Record<string, unknown>,
    @Res() response: ServerResponse,
  ) {
    const outcome = await this.oauth.authorize(query);

    if (outcome.kind === "error-page") {
      response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      response.end(
        `<!doctype html><meta charset="utf-8"><title>JobSpark</title>` +
          `<p>Connexion impossible : ${escapeHtml(outcome.message)}</p>`,
      );
      return;
    }

    response.writeHead(302, { Location: outcome.url });
    response.end();
  }

  @Public()
  @Post("oauth/token")
  async token(
    @Body() form: Record<string, unknown>,
    @Res() response: ServerResponse,
  ) {
    const { body, status } = await this.oauth.token(form ?? {});

    send(response, status, body);
  }

  @Public()
  @Post("oauth/register")
  async register(
    @Body() body: Record<string, unknown>,
    @Res() response: ServerResponse,
  ) {
    try {
      const client = await this.clients.register(body ?? {});

      send(response, 201, {
        client_id: client.clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: client.clientName,
        grant_types: ["authorization_code", "refresh_token"],
        redirect_uris: client.redirectUris,
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      });
    } catch (error) {
      if (!(error instanceof OAuthClientError)) throw error;

      send(response, 400, {
        error: "invalid_redirect_uri",
        error_description: error.message,
      });
    }
  }

  @Public()
  @Post("oauth/revoke")
  @HttpCode(200)
  async revoke(@Body() form: Record<string, unknown>) {
    await this.oauth.revoke(form?.token);

    return {};
  }

  /** For the consent page: who asks, and for what. */
  @Get("oauth/consent")
  async describe(
    @Query("request") request: string | undefined,
    @Req() httpRequest: CookieRequest,
  ) {
    requireSession(this.authService, httpRequest);
    const described = request ? await this.oauth.describe(request) : null;

    if (!described) {
      throw new NotFoundException(
        "Demande expirée : relancez la connexion depuis l'agent.",
      );
    }

    return described;
  }

  @Post("oauth/consent")
  async decide(
    @Body() body: OAuthConsentDecision,
    @Req() httpRequest: CookieRequest,
  ) {
    const session = requireSession(this.authService, httpRequest);

    try {
      return { redirectTo: await this.oauth.decide(session.email, body) };
    } catch (error) {
      if (error instanceof OAuthError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
