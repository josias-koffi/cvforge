import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { Redis } from "ioredis";

/** The shared Redis connection, or `null` when `REDIS_URL` is not set. */
export const REDIS = Symbol("REDIS");

export type RedisClient = Pick<
  Redis,
  "getBuffer" | "set" | "quit" | "disconnect" | "status"
>;

/**
 * Redis as a cache only (ADR-025): nothing kept there is the only copy of
 * anything, so a missing or unreachable Redis costs speed, never data.
 *
 * Commands are not queued while disconnected and fail after one retry: a
 * cache that makes a page wait for it is worse than no cache.
 */
export function createRedisClient(
  url: string | undefined,
  logger: Pick<Logger, "warn"> = new Logger("Redis"),
): Redis | null {
  if (!url?.trim()) return null;

  const client = new Redis(url, {
    enableOfflineQueue: false,
    lazyConnect: false,
    maxRetriesPerRequest: 1,
  });
  let warned = false;

  // One line per outage, not one per reconnection attempt.
  client.on("error", (error: Error) => {
    if (warned) return;
    warned = true;
    logger.warn(
      `Redis unavailable, caching off until it answers: ${error.message}`,
    );
  });
  client.on("ready", () => {
    warned = false;
  });

  return client;
}

@Global()
@Module({
  exports: [REDIS],
  providers: [
    {
      provide: REDIS,
      useFactory: () => createRedisClient(process.env.REDIS_URL),
    },
  ],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: RedisClient | null) {}

  /**
   * `quit` when connected, so pending writes land; `disconnect` otherwise,
   * which also stops the reconnection attempts — without it, a CLI run with
   * an unreachable Redis would never exit.
   */
  async onApplicationShutdown() {
    if (!this.redis) return;
    if (this.redis.status === "ready") await this.redis.quit();
    else this.redis.disconnect();
  }
}
