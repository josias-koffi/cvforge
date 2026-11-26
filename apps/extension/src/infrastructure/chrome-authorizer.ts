import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import type { Authorizer } from "../application/session";
import { readAuthorizationResponse } from "../domain/connection";
import type { ExtensionOAuthProvider } from "./oauth-provider";

/**
 * OAuth against JobSpark's own authorization server (ADR-033), with the
 * consent page shown by `chrome.identity.launchWebAuthFlow` (ADR-034 §4).
 */
export class ChromeAuthorizer implements Authorizer {
  constructor(
    private readonly provider: ExtensionOAuthProvider,
    private readonly api: { origin: string; mcpUrl: string },
    private readonly launchWebAuthFlow: (
      url: string,
    ) => Promise<string | undefined>,
    // Wrapped: a bare `fetch` called as a method throws "Illegal invocation".
    private readonly fetchFn: typeof fetch = (input, init) =>
      fetch(input, init),
  ) {}

  async authorize() {
    this.provider.interactive = true;
    this.provider.pendingAuthorizationUrl = null;
    try {
      const first = await auth(this.provider, {
        fetchFn: this.fetchFn,
        serverUrl: this.api.mcpUrl,
      });
      if (first === "AUTHORIZED") return;

      const url = this.provider.pendingAuthorizationUrl as URL | null;
      if (!url)
        throw new Error("JobSpark n'a pas donné de page d'autorisation.");
      const responseUrl = await this.launchWebAuthFlow(url.toString());
      if (!responseUrl) throw new Error("Connexion annulée.");

      const code = readAuthorizationResponse(responseUrl, {
        issuer: this.api.origin,
        state: await this.provider.expectedState(),
      });
      await auth(this.provider, {
        authorizationCode: code,
        fetchFn: this.fetchFn,
        serverUrl: this.api.mcpUrl,
      });
    } finally {
      this.provider.interactive = false;
      this.provider.pendingAuthorizationUrl = null;
      await this.provider.invalidateCredentials("verifier");
    }
  }

  async isConnected() {
    return Boolean((await this.provider.tokens())?.access_token);
  }

  async disconnect() {
    const tokens = await this.provider.tokens();
    const client = await this.provider.clientInformation();
    if (tokens?.refresh_token && client?.client_id) {
      // Revoking the refresh token ends the whole grant on JobSpark. Best
      // effort: the local tokens go away even if the network does not answer.
      await this.fetchFn(`${this.api.origin}/oauth/revoke`, {
        body: new URLSearchParams({
          client_id: client.client_id,
          token: tokens.refresh_token,
          token_type_hint: "refresh_token",
        }),
        method: "POST",
      }).catch(() => undefined);
    }
    await this.forget();
  }

  forget() {
    return this.provider.invalidateCredentials("tokens");
  }
}
