import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterService, ChatMessage } from './openrouter.service';
import { OpenRouterConfig } from './openrouter.config';

const BASE_CONFIG: OpenRouterConfig = {
  apiKey: 'test-key',
  baseUrl: 'https://openrouter.ai/api/v1',
  defaultModel: 'mistralai/mistral-small-2603',
  enableZdrChat: false,
  enableZdrStt: false,
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
