import {
  NOOP_AI_USAGE_RECORDER,
  NO_USAGE,
  recordUsage,
  type AiUsageRecorder,
  type UsageFigures,
} from './ai-usage';
import { runLlmAttempt } from './llm-attempt';
import {
  openRouterTarget,
  type ChatMessage,
  type ChatOptions,
  type LlmTarget,
} from './llm-types';
import { buildChain, runModelChain } from './openrouter.chain';
import { OpenRouterConfig } from './openrouter.config';
import { buildEmptyContentError } from './openrouter.error';
import { DEFAULT_RETRY_POLICY, RetryHooks } from './openrouter.retry';
import { NO_FEATURE_MODELS, type FeatureModelLookup } from './feature-models/feature-model.router';

export type { ChatMessage, ChatOptions } from './llm-types';

/**
 * Every text call of the product. The name predates direct providers: a call
 * can now start on Claude, and the OpenRouter chain stays behind it (ADR-030).
 */
export class OpenRouterService {
  constructor(
    private readonly config: OpenRouterConfig,
    private readonly retryHooks: RetryHooks = {},
    private readonly usageRecorder: AiUsageRecorder = NOOP_AI_USAGE_RECORDER,
    private readonly featureModels: FeatureModelLookup = NO_FEATURE_MODELS,
  ) {}

  private get retryPolicy() {
    return { ...DEFAULT_RETRY_POLICY, maxAttempts: this.config.maxAttempts };
  }

  /**
   * The admin's choice goes first, then the deployment's own chain, so a
   * feature pointed at a model that fails or runs out of credit still answers.
   */
  private async buildModelChain(options: ChatOptions): Promise<LlmTarget[]> {
    const { defaultModel, fallbackModels, featureModels } = this.config;
    const fallbacks = fallbackModels.map(openRouterTarget);

    if (options.model) return buildChain(openRouterTarget(options.model), fallbacks);

    const deployment = buildChain(openRouterTarget(defaultModel), fallbacks);
    const envModel = options.feature && featureModels?.[options.feature];
    const chain = envModel ? buildChain(openRouterTarget(envModel), deployment) : deployment;
    const chosen = options.feature && (await this.featureModels.targetFor(options.feature));

    return chosen && this.isUsable(chosen) ? buildChain(chosen, chain) : chain;
  }

  /** A choice saved before the key was withdrawn must not fail every call. */
  private isUsable(target: LlmTarget) {
    return target.provider !== 'anthropic' || Boolean(this.config.anthropicApiKey);
  }

  /**
   * Walks the chain and files the call's cost once (US-154). A call that fails
   * outright is filed too, so errors show in the cockpit.
   */
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const chain = await this.buildModelChain(options);
    const startedAt = Date.now();
    let target = chain[0];
    let paidForNothing: UsageFigures | null = null;
    const track = (usage: UsageFigures | null, status: 'ok' | 'error') =>
      recordUsage(this.usageRecorder, {
        ...(usage ?? NO_USAGE),
        durationMs: Date.now() - startedAt,
        feature: options.feature ?? 'other',
        fellBack: target !== chain[0],
        model: target.model,
        provider: target.provider,
        status,
      });

    try {
      const { text, usage } = await runModelChain(
        chain,
        async (candidate) => {
          target = candidate;
          const attempt = await runLlmAttempt(this.config, candidate, messages, options);
          if (attempt.text.trim()) return attempt;

          paidForNothing = attempt.usage;
          throw buildEmptyContentError(candidate.model);
        },
        this.retryPolicy,
        this.retryHooks,
      );
      track(usage, 'ok');
      return text;
    } catch (error) {
      track(paidForNothing, 'error');
      throw error;
    }
  }
}
