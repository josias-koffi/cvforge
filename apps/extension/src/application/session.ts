import {
  DEFAULT_AI_MODEL,
  maskSecret,
  readBalance,
  type PanelState,
} from "../domain/connection";

/** Connects the extension to the candidate's JobSpark account (OAuth). */
export interface Authorizer {
  /** Opens JobSpark's consent page and keeps the tokens. */
  authorize(): Promise<void>;
  isConnected(): Promise<boolean>;
  /** Revokes the grant on JobSpark when possible, then forgets the tokens. */
  disconnect(): Promise<void>;
  /** Forgets the tokens without calling JobSpark (already revoked there). */
  forget(): Promise<void>;
}

/** Calls a JobSpark MCP tool and returns its parsed JSON. */
export interface JobSparkTools {
  call(name: string, args?: Record<string, unknown>): Promise<unknown>;
}

/** Thrown by the tools when JobSpark no longer accepts the connection. */
export class ConnectionRevokedError extends Error {}

export type AiKeySettings = { apiKey: string; baseURL: string; model: string };

export interface AiKeyStore {
  get(): Promise<AiKeySettings | null>;
  save(settings: AiKeySettings): Promise<void>;
  clear(): Promise<void>;
}

/** The side panel's use cases. Secrets stay here, in the service worker. */
export class Session {
  constructor(
    private readonly deps: {
      apiHost: string;
      authorizer: Authorizer;
      tools: JobSparkTools;
      aiKeys: AiKeyStore;
    },
  ) {}

  async state(): Promise<PanelState> {
    const [connection, aiKey] = await Promise.all([
      this.connection(),
      this.deps.aiKeys.get(),
    ]);

    return {
      ...connection,
      aiKey: {
        configured: Boolean(aiKey),
        hint: aiKey ? maskSecret(aiKey.apiKey) : null,
        model: aiKey?.model ?? DEFAULT_AI_MODEL,
      },
      apiHost: this.deps.apiHost,
    };
  }

  async connect(): Promise<PanelState> {
    await this.deps.authorizer.authorize();
    return this.state();
  }

  async disconnect(): Promise<PanelState> {
    await this.deps.authorizer.disconnect();
    return this.state();
  }

  async saveAiKey(settings: AiKeySettings): Promise<PanelState> {
    const apiKey = settings.apiKey.trim();
    if (!apiKey) throw new Error("Clé IA vide.");
    if (!/^https:\/\//.test(settings.baseURL)) {
      throw new Error(
        "L'adresse du fournisseur IA doit commencer par https://.",
      );
    }
    await this.deps.aiKeys.save({
      apiKey,
      baseURL: settings.baseURL.replace(/\/+$/, ""),
      model: settings.model.trim() || DEFAULT_AI_MODEL,
    });
    return this.state();
  }

  async clearAiKey(): Promise<PanelState> {
    await this.deps.aiKeys.clear();
    return this.state();
  }

  private async connection(): Promise<Pick<PanelState, "status" | "balance">> {
    if (!(await this.deps.authorizer.isConnected())) {
      return { balance: null, status: "disconnected" };
    }
    try {
      const balance = readBalance(
        await this.deps.tools.call("get_credit_balance"),
      );
      return { balance, status: "connected" };
    } catch (error) {
      if (!(error instanceof ConnectionRevokedError)) throw error;
      // Revoked from /compte/agents, expired, or refresh token reused.
      await this.deps.authorizer.forget();
      return { balance: null, status: "revoked" };
    }
  }
}
