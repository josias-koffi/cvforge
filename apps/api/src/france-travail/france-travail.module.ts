import { Module } from "@nestjs/common";
import { createFtHttpClient, FtHttpClient } from "./ft-http.client";

/**
 * The France Travail platform layer (ADR-024). One client per process, so
 * every feature shares the same tokens and the same per-API quotas.
 */
@Module({
  exports: [FtHttpClient],
  providers: [
    { provide: FtHttpClient, useFactory: () => createFtHttpClient() },
  ],
})
export class FranceTravailModule {}
