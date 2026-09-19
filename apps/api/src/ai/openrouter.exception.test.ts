import { describe, it, expect } from 'vitest';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { OpenRouterRequestError } from './openrouter.error';
import { toHttpExceptionFromOpenRouter } from './openrouter.exception';

function openRouterError(status: number) {
  return new OpenRouterRequestError('failed', status, '', null, 'Mistral');
}

describe('toHttpExceptionFromOpenRouter', () => {
  it('maps a rate limit to 503 with a retry-friendly message', () => {
    const exception = toHttpExceptionFromOpenRouter(openRouterError(429));

    expect(exception.getStatus()).toBe(503);
    expect(exception.message).toContain('momentanement sature');
  });

  it('maps a transient gateway fault to 503', () => {
    expect(toHttpExceptionFromOpenRouter(openRouterError(502)).getStatus()).toBe(503);
  });

  it('maps a permanent OpenRouter error to 502', () => {
    expect(toHttpExceptionFromOpenRouter(openRouterError(400)).getStatus()).toBe(502);
  });

  it('passes an existing HttpException through untouched', () => {
    const notFound = new NotFoundException('nope');
    expect(toHttpExceptionFromOpenRouter(notFound)).toBe(notFound);
  });

  it('wraps an unknown error as a 502 rather than leaking a 500', () => {
    const exception = toHttpExceptionFromOpenRouter(new Error('boom'));

    expect(exception).toBeInstanceOf(BadGatewayException);
    expect(exception.message).not.toContain('boom');
  });
});
