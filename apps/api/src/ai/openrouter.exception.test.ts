import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadGatewayException, Logger, NotFoundException } from '@nestjs/common';
import { OpenRouterRequestError } from './openrouter.error';
import { toHttpExceptionFromOpenRouter } from './openrouter.exception';

function openRouterError(status: number) {
  return new OpenRouterRequestError('failed', status, '', null, 'Mistral');
}

describe('toHttpExceptionFromOpenRouter', () => {
  let errorLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the upstream detail the client never sees', () => {
    const detail = '{"error":{"message":"Insufficient credits"}}';
    toHttpExceptionFromOpenRouter(
      new OpenRouterRequestError('failed', 402, detail, null, 'Mistral'),
    );

    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('Insufficient credits'));
    expect(errorLog.mock.calls[0][0]).toContain('402');
    expect(errorLog.mock.calls[0][0]).toContain('Mistral');
  });

  it('logs an unexpected non-OpenRouter failure too', () => {
    toHttpExceptionFromOpenRouter(new Error('boom'));
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('boom'),
      expect.anything(),
    );
  });

  it('stays silent for a deliberate domain error', () => {
    toHttpExceptionFromOpenRouter(new NotFoundException('nope'));
    expect(errorLog).not.toHaveBeenCalled();
  });

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
