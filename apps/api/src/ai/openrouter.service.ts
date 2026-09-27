import type { AiFeature } from '@cvforge/types';
import {
  NOOP_AI_USAGE_RECORDER,
  NO_USAGE,
  readUsage,
  readUsageFrame,
  recordUsage,
  type AiUsageRecorder,
  type UsageFigures,
} from './ai-usage';
import { buildChain, runModelChain } from './openrouter.chain';
import { OpenRouterConfig } from './openrouter.config';
import { buildOpenRouterError } from './openrouter.error';
import { DEFAULT_RETRY_POLICY, RetryHooks } from './openrouter.retry';
import { CHAT_OPEN_TIMEOUT_MS, fetchWithOpenTimeout } from './openrouter.timeout';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type MultimodalTextPart = {
  type: 'text';
  text: string;
};

type OpenRouterMessage =
  | ChatMessage
  | {
      role: 'system' | 'user' | 'assistant';
      content: Array<MultimodalTextPart>;
    };

export interface ChatOptions {
  /** What the call is for, so the cockpit can price each feature (US-154). */
  feature?: AiFeature;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
  };
  responseFormat?: {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
}

export class OpenRouterService {
  constructor(
    private readonly config: OpenRouterConfig,
    private readonly retryHooks: RetryHooks = {},
    private readonly usageRecorder: AiUsageRecorder = NOOP_AI_USAGE_RECORDER,
  ) {}

  private get retryPolicy() {
    return { ...DEFAULT_RETRY_POLICY, maxAttempts: this.config.maxAttempts };
  }

  private buildHeaders() {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://cvforge.app',
      'X-Title': 'CVforge',
    };
  }

  private buildModelChain(options: ChatOptions): string[] {
    return buildChain(
      options.model ?? this.config.defaultModel,
      this.config.fallbackModels,
    );
  }

  private buildRequestBody(
    messages: OpenRouterMessage[],
    options: ChatOptions,
    enableZdr: boolean,
    extra: Record<string, unknown> = {},
  ) {
    return JSON.stringify({
      model: options.model ?? this.config.defaultModel,
      messages,
      ...extra,
      ...(options.provider && { provider: options.provider }),
      ...(options.responseFormat && { response_format: options.responseFormat }),
      ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...this.buildDefaults(enableZdr),
    });
  }

  // data_collection: "deny" is a per-request routing filter that restricts
  // OpenRouter to providers advertising ZDR support. Chat models can opt in via
  // ENABLE_ZDR_CHAT=true when the account does not enforce ZDR globally — note
  // that when it does, the account rule applies whatever this sends (ADR-013).
  private buildDefaults(enableZdr: boolean) {
    return {
      transforms: [],
      ...(enableZdr && { data_collection: 'deny' }),
    };
  }

  /**
   * Walks the model chain and hands back the response along with `track`,
   * which files the call's cost once its usage is known (US-154). A call that
   * fails outright is filed here, at zero cost, so errors show in the cockpit.
   */
  private async fetchCompletion(
    messages: OpenRouterMessage[],
    options: ChatOptions,
    enableZdr: boolean,
    operation: string,
    extra: Record<string, unknown> = {},
  ): Promise<{ response: Response; track: (usage: UsageFigures | null) => void }> {
    const chain = this.buildModelChain(options);
    const startedAt = Date.now();
    let model = chain[0];
    const track = (usage: UsageFigures | null, status: 'ok' | 'error' = 'ok') =>
      recordUsage(this.usageRecorder, {
        ...(usage ?? NO_USAGE),
        durationMs: Date.now() - startedAt,
        feature: options.feature ?? 'other',
        fellBack: model !== chain[0],
        model,
        status,
      });

    try {
      const response = await runModelChain(
        chain,
        (candidate) => {
          model = candidate;
          return this.fetchAttempt(messages, { ...options, model: candidate }, enableZdr, operation, extra);
        },
        this.retryPolicy,
        this.retryHooks,
      );
      return { response, track };
    } catch (error) {
      track(null, 'error');
      throw error;
    }
  }

  private async fetchAttempt(
    messages: OpenRouterMessage[],
    options: ChatOptions & { model: string },
    enableZdr: boolean,
    operation: string,
    extra: Record<string, unknown>,
  ): Promise<Response> {
    const attempt = await fetchWithOpenTimeout(
      `${this.config.baseUrl}/chat/completions`,
      {
        body: this.buildRequestBody(messages, options, enableZdr, extra),
        headers: this.buildHeaders(),
        method: 'POST',
      },
      CHAT_OPEN_TIMEOUT_MS,
      options.model,
    );

    if (!attempt.ok) throw await buildOpenRouterError(attempt, operation, options.model);
    return attempt;
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    return this.requestCompletion(messages, options);
  }

  async *streamChat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): AsyncGenerator<string, void, undefined> {
    const { response, track } = await this.fetchCompletion(
      messages,
      options,
      this.config.enableZdrChat,
      'OpenRouter stream failed',
      { stream: true },
    );

    const body = response.body;
    if (!body) throw new Error('OpenRouter stream failed: response had no body');

    const decoder = new TextDecoder();
    const reader = body.getReader();
    let buffer = '';
    // The usage rides on the last chunk, just before [DONE].
    let usage: UsageFigures | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          usage = readUsageFrame(line) ?? usage;
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') return;
          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } finally {
      reader.releaseLock();
      track(usage);
    }
  }

  private async requestCompletion(
    messages: OpenRouterMessage[],
    options: ChatOptions,
    enableZdr = this.config.enableZdrChat,
  ): Promise<string> {
    const { response, track } = await this.fetchCompletion(
      messages,
      options,
      enableZdr,
      'OpenRouter request failed',
    );

    const data = (await response.json()) as {
      choices: Array<{
        message: {
          content:
            | string
            | Array<{
                text?: string;
                type?: string;
              }>;
        };
      }>;
    };
    track(readUsage(data));

    const content = this.extractContent(data.choices?.[0]?.message?.content);
    if (content === null) {
      throw new Error('OpenRouter response contained no content');
    }

    return content;
  }

  private extractContent(
    content:
      | string
      | Array<{
          text?: string;
          type?: string;
        }>
      | undefined,
  ): string | null {
    if (typeof content === 'string') {
      return content;
    }

    if (!Array.isArray(content)) {
      return null;
    }

    const text = content
      .map((part) => (part.type === 'text' && typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    return text.length > 0 ? text : null;
  }
}
