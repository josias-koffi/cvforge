import { Module } from '@nestjs/common';
import { DATABASE, type Database } from '../database/database.types';
import type { AiUsageRecorder } from './ai-usage';
import { PgAiUsageRecorder } from './ai-usage.pg-recorder';
import { resolveOpenRouterBalanceConfig } from './openrouter-balance.config';
import { OpenRouterBalanceService } from './openrouter-balance.service';
import { resolveTranscriptionConfig } from './openrouter-transcription.config';
import { resolveVoiceConfig } from './openrouter-voice.config';
import { OpenRouterVoiceService } from './openrouter-voice.service';
import { OpenRouterTranscriptionService } from './openrouter-transcription.service';
import { resolveOpenRouterConfig } from './openrouter.config';
import { OpenRouterService } from './openrouter.service';

export const OPENROUTER_SERVICE = Symbol('OPENROUTER_SERVICE');
export const OPENROUTER_BALANCE_SERVICE = Symbol('OPENROUTER_BALANCE_SERVICE');
export const OPENROUTER_TRANSCRIPTION_SERVICE = Symbol(
  'OPENROUTER_TRANSCRIPTION_SERVICE',
);
export const OPENROUTER_VOICE_SERVICE = Symbol('OPENROUTER_VOICE_SERVICE');
const AI_USAGE_RECORDER = Symbol('AI_USAGE_RECORDER');

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
      provide: OPENROUTER_TRANSCRIPTION_SERVICE,
      inject: [AI_USAGE_RECORDER],
      useFactory: (recorder: AiUsageRecorder) =>
        new OpenRouterTranscriptionService(
          resolveTranscriptionConfig(),
          {},
          recorder,
        ),
    },
    {
      provide: OPENROUTER_VOICE_SERVICE,
      inject: [AI_USAGE_RECORDER],
      useFactory: (recorder: AiUsageRecorder) =>
        new OpenRouterVoiceService(resolveVoiceConfig(), {}, recorder),
    },
  ],
  exports: [
    OPENROUTER_SERVICE,
    OPENROUTER_BALANCE_SERVICE,
    OPENROUTER_TRANSCRIPTION_SERVICE,
    OPENROUTER_VOICE_SERVICE,
  ],
})
export class OpenRouterModule {}
