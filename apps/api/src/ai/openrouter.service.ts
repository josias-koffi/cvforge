import { OpenRouterConfig } from './openrouter.config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

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
    const model = options.model ?? this.config.defaultModel;

    const body = {
      model,
      messages,
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...OPENROUTER_DEFAULTS,
    };

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cvforge.app',
        'X-Title': 'CVforge',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      throw new Error(
        `OpenRouter request failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (content === undefined || content === null) {
      throw new Error('OpenRouter response contained no content');
    }

    return content;
  }
}
