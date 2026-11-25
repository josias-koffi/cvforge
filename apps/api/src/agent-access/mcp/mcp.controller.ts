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
} from "@nestjs/common";
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
  ) {}

  @Public()
  @Post()
  async handle(@Req() request: McpRequest, @Res() response: ServerResponse) {
    const principal = await this.gate.admit(request.headers);
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
