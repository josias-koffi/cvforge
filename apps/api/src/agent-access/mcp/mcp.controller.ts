import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  MethodNotAllowedException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { OAUTH_SCOPES_SUPPORTED } from "../oauth/oauth-rules";
import {
  OAUTH_CONFIG,
  protectedResourceMetadataUrl,
  type OAuthConfig,
} from "../oauth/oauth.config";
import { Public } from "../../auth/public.decorator";
import { AgentTokensService } from "../agent-tokens.service";
import { buildMcpServer } from "./mcp-server.factory";
import { McpRequestGate, type McpRequestHeaders } from "./mcp-request-gate";
import { MCP_TOOLS, type McpToolList } from "./mcp-tools.provider";

type McpRequest = IncomingMessage & {
  headers: McpRequestHeaders;
  body?: unknown;
};

/**
 * The MCP endpoint (ADR-032): Streamable HTTP, stateless. `@Public()` for the
 * cookie guard only — every request is admitted by its own agent token.
 */
@Controller("mcp")
export class McpController {
  constructor(
    @Inject(McpRequestGate) private readonly gate: McpRequestGate,
    @Inject(AgentTokensService) private readonly tokens: AgentTokensService,
    @Inject(MCP_TOOLS) private readonly tools: McpToolList,
    @Inject(OAUTH_CONFIG) private readonly oauth: OAuthConfig,
  ) {}

  @Public()
  @Post()
  async handle(@Req() request: McpRequest, @Res() response: ServerResponse) {
    const principal = await this.admit(request, response);
    const server = buildMcpServer(this.tools, principal, this.tokens);
    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
      sessionIdGenerator: undefined,
    });

    response.on("close", () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
  }

  /**
   * A 401 carries the OAuth challenge (MCP authorization, RFC 9728): it is
   * how claude.ai, ChatGPT and other clients find our authorization server
   * and start the sign-in.
   */
  private async admit(request: McpRequest, response: ServerResponse) {
    try {
      return await this.gate.admit(request.headers);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        const invalid = request.headers.authorization
          ? ', error="invalid_token"'
          : "";
        response.setHeader(
          "WWW-Authenticate",
          `Bearer resource_metadata="${protectedResourceMetadataUrl(this.oauth)}", ` +
            `scope="${OAUTH_SCOPES_SUPPORTED.join(" ")}"${invalid}`,
        );
      }

      throw error;
    }
  }

  /** Stateless: no server-initiated stream, no session to end. */
  @Public()
  @Get()
  @HttpCode(405)
  refuseStream() {
    throw new MethodNotAllowedException("Utilisez POST /mcp.");
  }

  @Public()
  @Delete()
  @HttpCode(405)
  refuseSessionEnd() {
    throw new MethodNotAllowedException("Utilisez POST /mcp.");
  }
}
