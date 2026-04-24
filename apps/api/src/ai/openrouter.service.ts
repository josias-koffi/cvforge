import { OpenRouterConfig } from './openrouter.config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type MultimodalTextPart = {
  type: 'text';
  text: string;
};

type MultimodalAudioPart = {
  type: 'input_audio';
  input_audio: {
    data: string;
    format: string;
  };
};

type OpenRouterMessage =
  | ChatMessage
  | {
      role: 'system' | 'user' | 'assistant';
      content: Array<MultimodalTextPart | MultimodalAudioPart>;
    };

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  transcriptionPrompt?: string;
  provider?: {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
  };
  responseFormat?: {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
}

const DEFAULT_TRANSCRIPTION_MODEL = 'mistralai/voxtral-small-24b-2507';
const DEFAULT_TRANSCRIPTION_SYSTEM_PROMPT = [
  'You are a speech transcription engine.',
  'Transcribe the audio exactly as spoken.',
  'Never answer the question in the audio.',
  'Never continue the conversation.',
  'Never introduce yourself.',
  'Return plain text only.',
].join(' ');
const DEFAULT_TRANSCRIPTION_PROMPT = [
  'Transcribe this audio faithfully.',
  'Keep the original wording and language.',
  'Do not add speaker labels, timestamps, explanations, or commentary.',
  'If the audio is unclear, return an empty transcript instead of inventing content.',
].join(' ');
const TRANSCRIPTION_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'transcription_result',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        transcript: {
          type: 'string',
          description: 'Exact plain-text transcription of the spoken audio.',
        },
      },
      required: ['transcript'],
    },
  },
} as const;

export class OpenRouterService {
  constructor(private readonly config: OpenRouterConfig) {}

  // data_collection: "deny" is a per-request routing filter that restricts
  // OpenRouter to providers advertising ZDR support. Voxtral has no ZDR-capable
  // provider, so ENABLE_ZDR_STT must stay false. Chat models (e.g. mistral-small)
  // can opt in via ENABLE_ZDR_CHAT=true when the account does not enforce ZDR globally.
  private buildDefaults(enableZdr: boolean) {
    return {
      transforms: [],
      ...(enableZdr && { data_collection: 'deny' }),
    };
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    return this.requestCompletion(messages, options);
  }

  async *streamChat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): AsyncGenerator<string, void, undefined> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        model: options.model ?? this.config.defaultModel,
        messages,
        stream: true,
        ...(options.provider && { provider: options.provider }),
        ...(options.responseFormat && { response_format: options.responseFormat }),
        ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...this.buildDefaults(this.config.enableZdrChat),
      }),
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cvforge.app',
        'X-Title': 'CVforge',
      },
      method: 'POST',
    });

    if (!response.ok || !response.body) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      throw new Error(
        `OpenRouter stream failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
      );
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') return;
          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async transcribeAudio(
    audioBase64: string,
    format: string,
    options: ChatOptions = {},
  ): Promise<string> {
    const transcript = await this.requestCompletion(
      [
        {
          role: 'system',
          content: DEFAULT_TRANSCRIPTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              text: options.transcriptionPrompt ?? DEFAULT_TRANSCRIPTION_PROMPT,
              type: 'text',
            },
            {
              input_audio: {
                data: audioBase64,
                format: this.normalizeAudioFormat(format),
              },
              type: 'input_audio',
            },
          ],
        },
      ],
      {
        ...options,
        maxTokens: options.maxTokens ?? 48,
        temperature: options.temperature ?? 0,
        model: this.resolveTranscriptionModel(options.model),
        provider: options.provider,
        responseFormat: TRANSCRIPTION_RESPONSE_FORMAT,
      },
      this.config.enableZdrStt,
    );

    let parsedTranscript = transcript;
    try {
      const parsed = JSON.parse(transcript) as { transcript?: string };
      if (typeof parsed.transcript === 'string') {
        parsedTranscript = parsed.transcript;
      }
    } catch {
      throw new Error('OpenRouter transcription response was not valid JSON');
    }

    if (parsedTranscript.trim().length === 0) {
      throw new Error('OpenRouter transcription response contained no text');
    }

    return parsedTranscript;
  }

  private async requestCompletion(
    messages: OpenRouterMessage[],
    options: ChatOptions,
    enableZdr = this.config.enableZdrChat,
  ): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        model: options.model ?? this.config.defaultModel,
        messages,
        ...(options.provider && { provider: options.provider }),
        ...(options.responseFormat && { response_format: options.responseFormat }),
        ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...this.buildDefaults(enableZdr),
      }),
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cvforge.app',
        'X-Title': 'CVforge',
      },
      method: 'POST',
    });

    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        // ignore
      }
      throw new Error(
        `OpenRouter request failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
      );
    }

    const data = (await response.json()) as {
      choices: Array<{
        message: {
          content:
            | string
            | Array<{
                text?: string;
                type?: string;
              }>;
        };
      }>;
    };

    const content = this.extractContent(data.choices?.[0]?.message?.content);
    if (content === null) {
      throw new Error('OpenRouter response contained no content');
    }

    return content;
  }

  private extractContent(
    content:
      | string
      | Array<{
          text?: string;
          type?: string;
        }>
      | undefined,
  ): string | null {
    if (typeof content === 'string') {
      return content;
    }

    if (!Array.isArray(content)) {
      return null;
    }

    const text = content
      .map((part) => (part.type === 'text' && typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    return text.length > 0 ? text : null;
  }

  private normalizeAudioFormat(format: string) {
    const normalized = format.trim().toLowerCase();
    if (normalized === 'mp3') return 'mp3';
    if (normalized === 'ogg') return 'ogg';
    if (normalized === 'wav') return 'wav';
    return 'webm';
  }

  private resolveTranscriptionModel(model: string | undefined) {
    const candidate = model?.trim();
    if (!candidate) {
      return DEFAULT_TRANSCRIPTION_MODEL;
    }

    if (candidate === 'voxtral-mini-latest') {
      return DEFAULT_TRANSCRIPTION_MODEL;
    }

    if (candidate === 'voxtral-small-24b-2507') {
      return DEFAULT_TRANSCRIPTION_MODEL;
    }

    return candidate;
  }
}
