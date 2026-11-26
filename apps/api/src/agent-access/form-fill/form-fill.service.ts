import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import {
  AI_CREDIT_ACTION_FORM_FILL,
  AI_CREDIT_COSTS,
  APPLICATION_STATUS_DRAFT,
} from "@cvforge/types";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { AiUsageRecorder } from "../../ai/ai-usage";
import { recordUsage } from "../../ai/ai-usage";
import type { FeatureModelLookup } from "../../ai/feature-models/feature-model.router";
import type { OpenRouterConfig } from "../../ai/openrouter.config";
import type { ApplicationsService } from "../../applications/applications.service";
import type { CreditsService } from "../../credits/credits.service";
import type { Database } from "../../database/database.types";
import { formFillSessions } from "../../database/schema";
import type { AgentPrincipal } from "../agent-tokens.service";

export const FORM_FILL_COST = AI_CREDIT_COSTS[AI_CREDIT_ACTION_FORM_FILL];
export const FORM_FILL_MAX_CALLS = 60;
export const FORM_FILL_TTL_MS = 15 * 60 * 1000;
/** Measured 2026-11-26: reliable and cheap on real forms (US-202). */
export const FORM_FILL_DEFAULT_MODEL = "openai/gpt-4.1-mini";
const MAX_OUTPUT_TOKENS = 2_000;
const MAX_MESSAGES = 200;

/** DI token for the form fill sessions store. */
export const FORM_FILL_STORE = Symbol("FORM_FILL_STORE");

export type FormFillStore = {
  create(session: {
    userEmail: string;
    tokenId: string;
    applicationId: string;
    expiresAt: Date;
  }): Promise<{ id: string; expiresAt: Date }>;
  /** Counts one call if the session is the user's, alive and under the cap. */
  takeCall(id: string, userEmail: string, now: Date): Promise<boolean>;
};

export class PgFormFillStore implements FormFillStore {
  constructor(private readonly db: Database) {}

  async create(session: Parameters<FormFillStore["create"]>[0]) {
    const [row] = await this.db
      .insert(formFillSessions)
      .values(session)
      .returning({
        expiresAt: formFillSessions.expiresAt,
        id: formFillSessions.id,
      });
    return row!;
  }

  async takeCall(id: string, userEmail: string, now: Date) {
    const rows = await this.db
      .update(formFillSessions)
      .set({ calls: sql`${formFillSessions.calls} + 1` })
      .where(
        and(
          eq(formFillSessions.id, id),
          eq(formFillSessions.userEmail, userEmail),
          gt(formFillSessions.expiresAt, now),
          lt(formFillSessions.calls, FORM_FILL_MAX_CALLS),
        ),
      )
      .returning({ id: formFillSessions.id });
    return rows.length === 1;
  }
}

/** The parts of an OpenAI-style request page-agent sends that we pass on. */
type ChatRequest = {
  messages?: unknown;
  tools?: unknown;
  tool_choice?: unknown;
  parallel_tool_calls?: unknown;
};

/**
 * Claude Sonnet 5.x refuses a request without reasoning, and reasoning
 * forbids a forced tool choice (measured 2026-11-26): keep reasoning low and
 * let the model pick its tool.
 */
export function adaptForModel(model: string, request: ChatRequest) {
  return /claude-(sonnet|opus)-5/.test(model)
    ? { reasoning: { effort: "low" }, tool_choice: "auto" }
    : request.tool_choice !== undefined
      ? { tool_choice: request.tool_choice }
      : {};
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Form fills paid in credits (US-202, ADR-034 §8 amended). The extension
 * opens a session (two credits), then its in-page agent's model calls come
 * here; JobSpark picks the model and calls it with its own key.
 */
export class FormFillService {
  private readonly logger = new Logger(FormFillService.name);

  constructor(
    private readonly deps: {
      store: FormFillStore;
      applications: Pick<ApplicationsService, "getApplicationForUser">;
      credits: Pick<
        CreditsService,
        "consumeCredits" | "getBalanceSummaryForUser"
      >;
      models: FeatureModelLookup;
      openRouter: Pick<
        OpenRouterConfig,
        "apiKey" | "baseUrl" | "enableZdrChat"
      >;
      usage: AiUsageRecorder;
      fetchFn?: typeof fetch;
      now?: () => Date;
    },
  ) {}

  async start(principal: AgentPrincipal, applicationId: string) {
    const application = await this.deps.applications.getApplicationForUser(
      principal.userEmail,
      applicationId,
    );
    if (application.status !== APPLICATION_STATUS_DRAFT) {
      throw new ConflictException("Cette candidature a déjà été envoyée.");
    }
    await this.deps.credits.consumeCredits({
      action: AI_CREDIT_ACTION_FORM_FILL,
      applicationId: application.id,
      userEmail: principal.userEmail,
    });
    const session = await this.deps.store.create({
      applicationId: application.id,
      expiresAt: new Date(this.now().getTime() + FORM_FILL_TTL_MS),
      tokenId: principal.tokenId,
      userEmail: principal.userEmail,
    });
    const { balance } = await this.deps.credits.getBalanceSummaryForUser(
      principal.userEmail,
    );
    return {
      balanceAfter: balance,
      creditsSpent: FORM_FILL_COST,
      expiresAt: session.expiresAt.toISOString(),
      fillSessionId: session.id,
      maxCalls: FORM_FILL_MAX_CALLS,
    };
  }

  /** One model call of the in-page agent, under the session's cap. */
  async relay(
    principal: AgentPrincipal,
    sessionId: string | undefined,
    body: unknown,
  ) {
    if (!sessionId || !UUID.test(sessionId)) {
      throw new ForbiddenException("Session de remplissage manquante.");
    }
    if (
      !(await this.deps.store.takeCall(
        sessionId,
        principal.userEmail,
        this.now(),
      ))
    ) {
      throw new HttpException(
        "Session de remplissage terminée (durée ou nombre d'appels atteint).",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const request = (body ?? {}) as ChatRequest;
    if (
      !Array.isArray(request.messages) ||
      request.messages.length > MAX_MESSAGES
    ) {
      throw new BadRequestException("Requête de modèle invalide.");
    }

    const target = await this.deps.models.targetFor("form_fill");
    const model =
      target?.provider === "openrouter"
        ? target.model
        : FORM_FILL_DEFAULT_MODEL;
    const started = this.now().getTime();
    const response = await (this.deps.fetchFn ?? ((u, i) => fetch(u, i)))(
      `${this.deps.openRouter.baseUrl}/chat/completions`,
      {
        body: JSON.stringify({
          max_tokens: MAX_OUTPUT_TOKENS,
          messages: request.messages,
          model,
          ...(request.tools !== undefined && { tools: request.tools }),
          ...adaptForModel(model, request),
          ...(request.parallel_tool_calls !== undefined && {
            parallel_tool_calls: request.parallel_tool_calls,
          }),
          // No prompt logging at OpenRouter; ZDR providers only when enabled (ADR-013).
          transforms: [],
          ...(this.deps.openRouter.enableZdrChat && {
            provider: { data_collection: "deny" },
          }),
          usage: { include: true },
        }),
        headers: {
          authorization: `Bearer ${this.deps.openRouter.apiKey}`,
          "content-type": "application/json",
          "HTTP-Referer": "https://jobspark.koklo.dev",
          "X-Title": "JobSpark extension",
        },
        method: "POST",
      },
    );
    const text = await response.text();
    this.recordUsage(model, text, response.ok, this.now().getTime() - started);
    if (!response.ok) {
      this.logger.warn(
        JSON.stringify({
          event: "form_fill_upstream_error",
          model,
          status: response.status,
        }),
      );
      throw new HttpException(
        "Le modèle n'a pas répondu, réessayez.",
        HttpStatus.BAD_GATEWAY,
      );
    }
    return JSON.parse(text) as unknown;
  }

  private recordUsage(
    model: string,
    text: string,
    ok: boolean,
    durationMs: number,
  ) {
    let usage: {
      prompt_tokens?: number;
      completion_tokens?: number;
      cost?: number;
    } = {};
    try {
      usage = (JSON.parse(text) as { usage?: typeof usage }).usage ?? {};
    } catch {
      // An error page: counted as an error without figures.
    }
    recordUsage(this.deps.usage, {
      completionTokens: usage.completion_tokens ?? 0,
      costUsd: usage.cost ?? 0,
      durationMs,
      feature: "form_fill",
      fellBack: false,
      model,
      promptTokens: usage.prompt_tokens ?? 0,
      provider: "openrouter",
      status: ok ? "ok" : "error",
    });
  }

  private now() {
    return this.deps.now?.() ?? new Date();
  }
}
