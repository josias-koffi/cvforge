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
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => makeResponse('ok'));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends transforms: [] to disable prompt logging in every request', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.transforms).toEqual([]);
  });

  it('uses the default model from config', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('mistralai/mistral-small-2603');
  });

  it('allows overriding the model per call', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES, { model: 'mistralai/mistral-large' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('mistralai/mistral-large');
    expect(body.transforms).toEqual([]);
  });

  it('passes temperature when provided', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES, { temperature: 0.7 });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.temperature).toBe(0.7);
  });

  it('omits temperature when not provided', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.temperature).toBeUndefined();
  });

  it('calls the correct OpenRouter endpoint', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
  });

  it('includes the Authorization header', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-key');
  });

  it('returns the text content from the response', async () => {
    fetchMock.mockImplementation(() => makeResponse('Generated text'));
    const svc = new OpenRouterService(BASE_CONFIG);
    const result = await svc.chat(MESSAGES);
    expect(result).toBe('Generated text');
  });

  it('throws on non-OK HTTP response with body detail', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('{"error":"model not found"}', { status: 404, statusText: 'Not Found' })),
    );
    const svc = new OpenRouterService(BASE_CONFIG);
    await expect(svc.chat(MESSAGES)).rejects.toThrow('OpenRouter request failed: 404');
  });

  it('throws when response has no choices content', async () => {
    fetchMock.mockImplementation(() =>
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
