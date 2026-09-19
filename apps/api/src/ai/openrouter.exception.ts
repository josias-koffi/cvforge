import {
  BadGatewayException,
  HttpException,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";

import { OpenRouterRequestError } from "./openrouter.error";

/**
 * The client gets a generic message on purpose — upstream payloads carry
 * provider internals. The cause must therefore never be dropped: it is logged
 * here, or nobody can tell a throttle apart from an empty balance.
 */
const logger = new Logger("OpenRouter");

const RATE_LIMITED_MESSAGE =
  "Le service d'IA est momentanement sature. Merci de reessayer dans quelques instants.";

const UPSTREAM_FAILURE_MESSAGE =
  "Le service d'IA est temporairement indisponible. Merci de reessayer plus tard.";

/**
 * Turns an exhausted OpenRouter call into an honest HTTP status. A throttled
 * provider is not our bug, so it must not surface as a 500: a 503 tells the
 * client the request is worth retrying, and keeps error dashboards meaningful.
 */
export function toHttpExceptionFromOpenRouter(error: unknown): HttpException {
  if (!(error instanceof OpenRouterRequestError)) {
    // An HttpException is a deliberate domain error, already meaningful.
    if (error instanceof HttpException) return error;

    logger.error(
      `Unexpected AI failure: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error.stack : undefined,
    );
    return new BadGatewayException(UPSTREAM_FAILURE_MESSAGE);
  }

  logger.error(
    `OpenRouter ${error.status}` +
      `${error.model ? ` on ${error.model}` : ""}` +
      `${error.providerName ? ` via ${error.providerName}` : ""}` +
      ` — ${error.detail || error.message}`,
  );

  if (error.isRateLimited) {
    return new ServiceUnavailableException(RATE_LIMITED_MESSAGE);
  }

  if (error.isRetryable) {
    return new ServiceUnavailableException(UPSTREAM_FAILURE_MESSAGE);
  }

  return new BadGatewayException(UPSTREAM_FAILURE_MESSAGE);
}

/**
 * Wraps an OpenRouter call so an exhausted provider surfaces as a 502/503
 * instead of a bare 500. Every call site should go through this.
 */
export async function withOpenRouterHttpErrors<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw toHttpExceptionFromOpenRouter(error);
  }
}
