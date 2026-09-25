import { Module } from '@nestjs/common';
import { DATABASE, type Database } from '../database/database.types';
import type { AiUsageRecorder } from './ai-usage';
import { PgAiUsageRecorder } from './ai-usage.pg-recorder';
import { resolveOpenRouterBalanceConfig } from './openrouter-balance.config';
import { OpenRouterBalanceService } from './openrouter-balance.service';
import { resolveOpenAiRealtimeConfig } from './openai-realtime.config';
import { OpenAiRealtimeService } from './openai-realtime.service';
import { resolveOpenRouterConfig } from './openrouter.config';
import { OpenRouterService } from './openrouter.service';

export const OPENROUTER_SERVICE = Symbol('OPENROUTER_SERVICE');
export const OPENROUTER_BALANCE_SERVICE = Symbol('OPENROUTER_BALANCE_SERVICE');
/** The live interview's voice, straight to OpenAI rather than via OpenRouter (ADR-026). */
export const OPENAI_REALTIME_SERVICE = Symbol('OPENAI_REALTIME_SERVICE');
export const AI_USAGE_RECORDER = Symbol('AI_USAGE_RECORDER');

@Module({
  providers: [
    {
      // Every AI call files its cost here (US-154); see ai-usage.ts.
      provide: AI_USAGE_RECORDER,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgAiUsageRecorder(db),
    },
    {
      provide: OPENROUTER_SERVICE,
      inject: [AI_USAGE_RECORDER],
      useFactory: (recorder: AiUsageRecorder) =>
        new OpenRouterService(resolveOpenRouterConfig(), {}, recorder),
    },
    {
      provide: OPENROUTER_BALANCE_SERVICE,
      useFactory: () =>
        new OpenRouterBalanceService(
          resolveOpenRouterBalanceConfig(process.env),
        ),
    },
    {
      provide: OPENAI_REALTIME_SERVICE,
      useFactory: () => new OpenAiRealtimeService(resolveOpenAiRealtimeConfig()),
    },
  ],
  exports: [
    OPENROUTER_SERVICE,
    OPENROUTER_BALANCE_SERVICE,
    OPENAI_REALTIME_SERVICE,
    AI_USAGE_RECORDER,
  ],
})
export class OpenRouterModule {}
