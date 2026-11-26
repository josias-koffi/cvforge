import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { EXTENSION_SCOPE } from "../domain/connection";
import type { KeyValueStore } from "./local-store";

const KEYS = {
  client: "oauth.client",
  state: "oauth.state",
  tokens: "oauth.tokens",
  verifier: "oauth.verifier",
} as const;

/** Raised when JobSpark wants the consent page but nobody clicked "connect". */
export class InteractionRequiredError extends Error {}

/**
 * The SDK's OAuth client, backed by extension storage. It registers itself
 * once (DCR) with the chromiumapp.org redirect, and never opens a window on
 * its own: the authorization URL is handed to `chrome.identity` by the
 * authorizer, and only after the candidate asked to connect.
 */
export class ExtensionOAuthProvider implements OAuthClientProvider {
  /** Set by the SDK when a consent is needed; read by the authorizer. */
  pendingAuthorizationUrl: URL | null = null;
  interactive = false;

  constructor(
    private readonly store: KeyValueStore,
    readonly redirectUrl: string,
  ) {}

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: "Extension JobSpark",
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [this.redirectUrl],
      response_types: ["code"],
      scope: EXTENSION_SCOPE,
      token_endpoint_auth_method: "none",
    };
  }

  clientInformation() {
    return this.store.get<OAuthClientInformationMixed>(KEYS.client);
  }

  saveClientInformation(info: OAuthClientInformationMixed) {
    return this.store.set(KEYS.client, info);
  }

  tokens() {
    return this.store.get<OAuthTokens>(KEYS.tokens);
  }

  saveTokens(tokens: OAuthTokens) {
    return this.store.set(KEYS.tokens, tokens);
  }

  async state() {
    const state = crypto.randomUUID();
    await this.store.set(KEYS.state, state);
    return state;
  }

  async expectedState() {
    return (await this.store.get<string>(KEYS.state)) ?? "";
  }

  redirectToAuthorization(url: URL) {
    if (!this.interactive) {
      throw new InteractionRequiredError("Reconnexion à JobSpark nécessaire.");
    }
    this.pendingAuthorizationUrl = url;
  }

  saveCodeVerifier(verifier: string) {
    return this.store.set(KEYS.verifier, verifier);
  }

  async codeVerifier() {
    const verifier = await this.store.get<string>(KEYS.verifier);
    if (!verifier) throw new Error("Aucune autorisation en cours.");
    return verifier;
  }

  async invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier" | "discovery",
  ) {
    if (scope === "all" || scope === "client")
      await this.store.remove(KEYS.client);
    if (scope === "all" || scope === "tokens")
      await this.store.remove(KEYS.tokens);
    if (scope === "all" || scope === "verifier") {
      await this.store.remove(KEYS.verifier, KEYS.state);
    }
  }
}
