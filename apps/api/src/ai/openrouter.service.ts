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
}

// ZDR is enforced at the OpenRouter account level ("Always enforce ZDR").
// Per-request provider constraints caused "No endpoints found" for this model;
// account-level ZDR covers all requests without per-request routing filters.
const OPENROUTER_DEFAULTS = {
  transforms: [],
} as const;

export class OpenRouterService {
  constructor(private readonly config: OpenRouterConfig) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    return this.requestCompletion(messages, options);
  }

  async transcribeAudio(
    audioBase64: string,
    format: string,
    prompt: string,
    options: ChatOptions = {},
  ): Promise<string> {
    return this.requestCompletion(
      [
        {
          role: 'user',
          content: [
            {
              text: prompt,
              type: 'text',
            },
            {
              input_audio: {
                data: audioBase64,
                format,
              },
              type: 'input_audio',
            },
          ],
        },
      ],
      options,
    );
  }

  private async requestCompletion(
    messages: OpenRouterMessage[],
    options: ChatOptions,
  ): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        model: options.model ?? this.config.defaultModel,
        messages,
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...OPENROUTER_DEFAULTS,
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
}
