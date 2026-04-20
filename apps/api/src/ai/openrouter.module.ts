import { Module } from '@nestjs/common';
import { resolveOpenRouterConfig } from './openrouter.config';
import { OpenRouterService } from './openrouter.service';

export const OPENROUTER_SERVICE = Symbol('OPENROUTER_SERVICE');

@Module({
  providers: [
    {
      provide: OPENROUTER_SERVICE,
      useFactory: () => new OpenRouterService(resolveOpenRouterConfig()),
    },
  ],
  exports: [OPENROUTER_SERVICE],
})
export class OpenRouterModule {}
