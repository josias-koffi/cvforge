import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterService, ChatMessage } from './openrouter.service';
import { OpenRouterConfig } from './openrouter.config';

const BASE_CONFIG: OpenRouterConfig = {
  apiKey: 'test-key',
  baseUrl: 'https://openrouter.ai/api/v1',
  defaultModel: 'mistralai/mistral-small-2603',
  fallbackModels: [],
  maxAttempts: 3,
  enableZdrChat: false,
  enableZdrStt: false,
};

/** Keeps backoff instantaneous and deterministic across retry assertions. */
const NO_SLEEP_HOOKS = { random: () => 0, sleep: () => Promise.resolve() };

function makeService(overrides: Partial<OpenRouterConfig> = {}) {
  return new OpenRouterService({ ...BASE_CONFIG, ...overrides }, NO_SLEEP_HOOKS);
}

function makeErrorResponse(status: number, body = '{}', headers: Record<string, string> = {}) {
  return Promise.resolve(new Response(body, { status, statusText: 'Error', headers }));
}

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

  it('sends audio transcription requests through OpenRouter chat completions', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({ transcript: 'Bonjour le monde' }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );
    const svc = new OpenRouterService(BASE_CONFIG);

    const result = await svc.transcribeAudio('UklGRiQAAABXQVZF', 'wav');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    expect(result).toBe('Bonjour le monde');

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('mistralai/voxtral-small-24b-2507');
    expect(body.max_tokens).toBe(48);
    expect(body.temperature).toBe(0);
    expect(body.response_format).toEqual({
      json_schema: {
        name: 'transcription_result',
        schema: {
          additionalProperties: false,
          properties: {
            transcript: {
              description: 'Exact plain-text transcription of the spoken audio.',
              type: 'string',
            },
          },
          required: ['transcript'],
          type: 'object',
        },
        strict: true,
      },
      type: 'json_schema',
    });
    expect(body.messages).toEqual([
      {
        content: expect.stringContaining('You are a speech transcription engine.'),
        role: 'system',
      },
      {
        content: [
          {
            text: 'Transcribe this audio faithfully. Keep the original wording and language. Do not add speaker labels, timestamps, explanations, or commentary. If the audio is unclear, return an empty transcript instead of inventing content.',
            type: 'text',
          },
          {
            input_audio: {
              data: 'UklGRiQAAABXQVZF',
              format: 'wav',
            },
            type: 'input_audio',
          },
        ],
        role: 'user',
      },
    ]);
  });

  it('streams chat completion chunks via streamChat', async () => {
    const ssePayload = [
      'data: {"choices":[{"delta":{"content":"Bonne "}}]}\n',
      'data: {"choices":[{"delta":{"content":"reponse!"}}]}\n',
      'data: [DONE]\n',
    ].join('\n');

    const sseBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(ssePayload));
        controller.close();
      },
    });

    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(sseBody, { status: 200 })),
    );

    const svc = new OpenRouterService(BASE_CONFIG);
    const collected: string[] = [];
    for await (const chunk of svc.streamChat(MESSAGES)) {
      collected.push(chunk);
    }

    expect(collected).toEqual(['Bonne ', 'reponse!']);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.stream).toBe(true);
  });

  it('omits data_collection on chat when enableZdrChat is false', async () => {
    const svc = new OpenRouterService({ ...BASE_CONFIG, enableZdrChat: false });
    await svc.chat(MESSAGES);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.data_collection).toBeUndefined();
  });

  it('sends data_collection: deny on chat when enableZdrChat is true', async () => {
    const svc = new OpenRouterService({ ...BASE_CONFIG, enableZdrChat: true });
    await svc.chat(MESSAGES);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.data_collection).toBe('deny');
  });

  it('omits data_collection on STT when enableZdrStt is false', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ choices: [{ message: { content: '{"transcript":"Bonjour"}' } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const svc = new OpenRouterService({ ...BASE_CONFIG, enableZdrStt: false });
    await svc.transcribeAudio('AAA', 'webm');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.data_collection).toBeUndefined();
  });

  it('normalizes legacy OpenRouter Voxtral model names to the Mistral transcription service', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ choices: [{ message: { content: '{"transcript":"Bonjour"}' } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.transcribeAudio('AAA', 'webm', {
      model: 'mistralai/voxtral-small-24b-2507',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('mistralai/voxtral-small-24b-2507');
  });

  it('passes provider routing preferences when provided', async () => {
    const svc = new OpenRouterService(BASE_CONFIG);
    await svc.chat(MESSAGES, {
      provider: {
        allow_fallbacks: false,
        order: ['mistral'],
        require_parameters: true,
      },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.provider).toEqual({
      allow_fallbacks: false,
      order: ['mistral'],
      require_parameters: true,
    });
  });

  it('throws on non-OK response from streamChat', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('{"error":"model not found"}', { status: 404, statusText: 'Not Found' })),
    );
    const svc = new OpenRouterService(BASE_CONFIG);
    const gen = svc.streamChat(MESSAGES);
    await expect(gen.next()).rejects.toThrow('OpenRouter stream failed: 404');
  });

  it('throws when the transcription response has no text', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ choices: [{ message: { content: '{"transcript":""}' } }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const svc = new OpenRouterService(BASE_CONFIG);
    await expect(svc.transcribeAudio('UklGRiQAAABXQVZF', 'webm')).rejects.toThrow(
      'contained no text',
    );
  });

  it('sends the fallback chain in models when no per-call model is given', async () => {
    const svc = makeService({ fallbackModels: ['google/gemini-2.5-flash'] });
    await svc.chat(MESSAGES);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.models).toEqual([
      'mistralai/mistral-small-2603',
      'google/gemini-2.5-flash',
    ]);
    expect(body.model).toBeUndefined();
  });

  it('makes an explicit per-call model the primary, keeping the fallback chain', async () => {
    const svc = makeService({ fallbackModels: ['google/gemini-2.5-flash'] });
    await svc.chat(MESSAGES, { model: 'mistralai/mistral-large' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.models).toEqual(['mistralai/mistral-large', 'google/gemini-2.5-flash']);
    expect(body.model).toBeUndefined();
  });

  it('sends the model alone when the caller pins it', async () => {
    const svc = makeService({ fallbackModels: ['google/gemini-2.5-flash'] });
    await svc.chat(MESSAGES, { model: 'mistralai/mistral-large', pinModel: true });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('mistralai/mistral-large');
    expect(body.models).toBeUndefined();
  });

  it('never repeats the primary inside its own fallback chain', async () => {
    const svc = makeService({ fallbackModels: ['mistralai/mistral-small-2603', 'openai/gpt-5-mini'] });
    await svc.chat(MESSAGES);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.models).toEqual(['mistralai/mistral-small-2603', 'openai/gpt-5-mini']);
  });

  it('keeps transcription on a single model, never the chat fallback chain', async () => {
    fetchMock.mockImplementation(() => makeResponse('{"transcript":"Bonjour"}'));
    const svc = makeService({ fallbackModels: ['google/gemini-2.5-flash'] });
    await svc.transcribeAudio('AAA', 'webm');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('mistralai/voxtral-small-24b-2507');
    expect(body.models).toBeUndefined();
  });

  it('retries an upstream 429 and returns the retried result', async () => {
    fetchMock
      .mockImplementationOnce(() =>
        makeErrorResponse(429, '{"error":{"metadata":{"provider_name":"Mistral"}}}'),
      )
      .mockImplementationOnce(() => makeResponse('Recovered'));

    const result = await makeService().chat(MESSAGES);

    expect(result).toBe('Recovered');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after maxAttempts and surfaces the last rate-limit error', async () => {
    fetchMock.mockImplementation(() => makeErrorResponse(429));

    await expect(makeService({ maxAttempts: 2 }).chat(MESSAGES)).rejects.toThrow(
      'OpenRouter request failed: 429',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-retryable 400', async () => {
    fetchMock.mockImplementation(() => makeErrorResponse(400));

    await expect(makeService().chat(MESSAGES)).rejects.toThrow('400');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('waits for the Retry-After delay the provider asked for', async () => {
    const sleep = vi.fn(() => Promise.resolve());
    fetchMock
      .mockImplementationOnce(() => makeErrorResponse(429, '{}', { 'Retry-After': '2' }))
      .mockImplementationOnce(() => makeResponse('ok'));

    const svc = new OpenRouterService(BASE_CONFIG, { random: () => 0, sleep });
    await svc.chat(MESSAGES);

    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('retries a network-level fetch rejection', async () => {
    fetchMock
      .mockImplementationOnce(() => Promise.reject(new TypeError('fetch failed')))
      .mockImplementationOnce(() => makeResponse('Recovered'));

    await expect(makeService().chat(MESSAGES)).resolves.toBe('Recovered');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a 429 on streamChat too', async () => {
    const sseBody = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\ndata: [DONE]\n'),
        );
        controller.close();
      },
    });
    fetchMock
      .mockImplementationOnce(() => makeErrorResponse(429))
      .mockImplementationOnce(() => Promise.resolve(new Response(sseBody, { status: 200 })));

    const collected: string[] = [];
    for await (const chunk of makeService().streamChat(MESSAGES)) collected.push(chunk);

    expect(collected).toEqual(['hi']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when the transcription response is not valid JSON', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'Bonjour le monde' } }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const svc = new OpenRouterService(BASE_CONFIG);
    await expect(svc.transcribeAudio('UklGRiQAAABXQVZF', 'webm')).rejects.toThrow(
      'not valid JSON',
    );
  });
});
