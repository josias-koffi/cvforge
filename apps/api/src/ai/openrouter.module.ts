import { Module } from '@nestjs/common';
import { resolveOpenRouterBalanceConfig } from './openrouter-balance.config';
import { OpenRouterBalanceService } from './openrouter-balance.service';
import { resolveOpenRouterConfig } from './openrouter.config';
import { OpenRouterService } from './openrouter.service';

export const OPENROUTER_SERVICE = Symbol('OPENROUTER_SERVICE');
export const OPENROUTER_BALANCE_SERVICE = Symbol('OPENROUTER_BALANCE_SERVICE');

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
  ],
  exports: [OPENROUTER_SERVICE, OPENROUTER_BALANCE_SERVICE],
})
export class OpenRouterModule {}
