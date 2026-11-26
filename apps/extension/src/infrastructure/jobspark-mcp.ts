import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  ConnectionRevokedError,
  type JobSparkTools,
} from "../application/session";
import { parseToolJson } from "../domain/connection";
import {
  InteractionRequiredError,
  type ExtensionOAuthProvider,
} from "./oauth-provider";

/**
 * JobSpark's MCP server (`/mcp`, stateless HTTP), called from the service
 * worker only: host_permissions, no CORS, and the token never reaches a page
 * (ADR-032, ADR-034 §3). The SDK refreshes the access token on a 401.
 */
export class JobSparkMcp implements JobSparkTools {
  private client: Client | null = null;

  constructor(
    private readonly mcpUrl: string,
    private readonly provider: ExtensionOAuthProvider,
    private readonly version: string,
    // Wrapped: a bare `fetch` called as a method throws "Illegal invocation".
    private readonly fetchFn: typeof fetch = (input, init) =>
      fetch(input, init),
  ) {}

  async call(name: string, args: Record<string, unknown> = {}) {
    try {
      const client = await this.connected();
      return parseToolJson(await client.callTool({ arguments: args, name }));
    } catch (error) {
      await this.reset();
      throw explain(error);
    }
  }

  private async connected() {
    if (this.client) return this.client;
    const client = new Client({
      name: "jobspark-extension",
      version: this.version,
    });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(this.mcpUrl), {
        authProvider: this.provider,
        fetch: this.fetchFn,
      }),
    );
    this.client = client;
    return client;
  }

  private async reset() {
    const client = this.client;
    this.client = null;
    await client?.close().catch(() => undefined);
  }
}

/**
 * A refused refresh ends in UnauthorizedError or a consent request; a token
 * refused even after a refresh ends in a 401. All three mean "reconnect".
 */
function explain(error: unknown): unknown {
  if (
    error instanceof UnauthorizedError ||
    error instanceof InteractionRequiredError ||
    (error instanceof StreamableHTTPError && error.code === 401)
  ) {
    return new ConnectionRevokedError(
      "Connexion JobSpark révoquée ou expirée.",
    );
  }
  if (
    error instanceof StreamableHTTPError &&
    /Origine non autoris/.test(error.message)
  ) {
    return new Error(
      "Le serveur JobSpark n'autorise pas encore cette extension (MCP_ALLOWED_ORIGINS).",
    );
  }
  return error;
}
