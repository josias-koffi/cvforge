import { Module } from '@nestjs/common';
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

@Module({
  providers: [
    {
      provide: OPENROUTER_SERVICE,
      useFactory: () => new OpenRouterService(resolveOpenRouterConfig()),
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
      useFactory: () =>
        new OpenRouterTranscriptionService(resolveTranscriptionConfig()),
    },
    {
      provide: OPENROUTER_VOICE_SERVICE,
      useFactory: () => new OpenRouterVoiceService(resolveVoiceConfig()),
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
