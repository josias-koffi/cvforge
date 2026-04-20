import { OpenRouterConfig } from './openrouter.config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
}

// RGPD invariants — these values are constants and must never be driven
// by caller options or environment variables to remain auditable.
const ZDR_PAYLOAD = {
  zdr: true,
  transforms: [],
  provider: { only: ['Mistral'], allow_fallbacks: false },
} as const;

export class OpenRouterService {
  constructor(private readonly config: OpenRouterConfig) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const model = options.model ?? this.config.defaultModel;

    const body = {
      model,
      messages,
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...ZDR_PAYLOAD,
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
      throw new Error(`OpenRouter request failed: ${response.status} ${response.statusText}`);
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
