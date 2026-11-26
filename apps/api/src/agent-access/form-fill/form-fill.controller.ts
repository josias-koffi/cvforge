import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Inject,
  Post,
  Req,
} from "@nestjs/common";
import {
  McpRequestGate,
  type McpRequestHeaders,
} from "../mcp/mcp-request-gate";
import { FormFillService } from "./form-fill.service";

type RelayRequest = {
  headers: McpRequestHeaders & { "x-jobspark-fill-session"?: string };
};

/**
 * The model behind the extension's form filler (US-202), OpenAI-compatible
 * so page-agent can call it. Admitted like `/mcp`: an agent token, an allowed
 * origin, the per-token rate limit; then the fill session's own cap.
 */
@Controller("agent/llm")
export class FormFillController {
  constructor(
    @Inject(McpRequestGate) private readonly gate: McpRequestGate,
    @Inject(FormFillService) private readonly fills: FormFillService,
  ) {}

  @Post("chat/completions")
  @HttpCode(200)
  async complete(@Req() request: RelayRequest, @Body() body: unknown) {
    const principal = await this.gate.admit(request.headers);
    if (!principal.scopes.has("documents:generate")) {
      throw new ForbiddenException(
        "Ce jeton ne permet pas de dépenser des crédits.",
      );
    }
    return this.fills.relay(
      principal,
      request.headers["x-jobspark-fill-session"],
      body,
    );
  }
}
