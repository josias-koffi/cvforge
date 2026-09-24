import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { REDIS, type RedisClient } from "../shared/redis/redis.module";
import { CompanyLogosController } from "./company-logos.controller";
import { CompanyLogosService } from "./company-logos.service";

/** Company logos from France Travail and Wikimedia, cached in Redis (ADR-025). */
@Module({
  controllers: [CompanyLogosController],
  imports: [AuthModule],
  providers: [
    {
      inject: [REDIS],
      provide: CompanyLogosService,
      useFactory: (redis: RedisClient | null) => new CompanyLogosService(redis),
    },
  ],
})
export class CompanyLogosModule {}
