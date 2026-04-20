import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterService, ChatMessage } from './openrouter.service';
import { OpenRouterConfig } from './openrouter.config';

const BASE_CONFIG: OpenRouterConfig = {
  apiKey: 'test-key',
  baseUrl: 'https://openrouter.ai/api/v1',
  defaultModel: 'mistralai/mistral-small-2603',
};

const MESSAGES: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

function makeResponse(content: string, status = 200) {
  return Promise.resolve(
    new Response(
      JSON.stringify({ choices: [{ message: { content } }] }),
      { status, headers: { 'Content-Type': 'application/json' } },
    ),
  );
}

describe('OpenRouterService', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      makeResponse('ok'),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends zdr: true in every request body', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES);

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.zdr).toBe(true);
  });

  it('sends transforms: [] to disable prompt logging', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES);

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.transforms).toEqual([]);
  });

  it('limits provider to Mistral only', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES);

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.provider.only).toEqual(['Mistral']);
    expect(body.provider.allow_fallbacks).toBe(false);
  });

  it('uses the default model from config', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES);

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('mistralai/mistral-small-2603');
  });

  it('allows overriding the model per call', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES, { model: 'mistralai/mistral-large' });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('mistralai/mistral-large');
    // RGPD invariants must still be present even with a different model
    expect(body.zdr).toBe(true);
    expect(body.transforms).toEqual([]);
    expect(body.provider.only).toEqual(['Mistral']);
  });

  it('passes temperature when provided', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES, { temperature: 0.7 });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.temperature).toBe(0.7);
  });

  it('omits temperature when not provided', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES);

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.temperature).toBeUndefined();
  });

  it('calls the correct OpenRouter endpoint', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES);

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
  });

  it('includes the Authorization header', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES);

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-key');
  });

  it('returns the text content from the response', async () => {
    fetchSpy.mockImplementation(() => makeResponse('Generated text'));
    const svc = new OpenRouterService(BASE_CONFIG);
    const result = await svc.chat(MESSAGES);
    expect(result).toBe('Generated text');
  });

  it('throws on non-OK HTTP response', async () => {
    fetchSpy.mockImplementation(() =>
      Promise.resolve(new Response('', { status: 429, statusText: 'Too Many Requests' })),
    );
    const svc = new OpenRouterService(BASE_CONFIG);
    await expect(svc.chat(MESSAGES)).rejects.toThrow('OpenRouter request failed: 429');
  });

  it('throws when response has no choices content', async () => {
    fetchSpy.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ choices: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const svc = new OpenRouterService(BASE_CONFIG);
    await expect(svc.chat(MESSAGES)).rejects.toThrow('no content');
  });
});
