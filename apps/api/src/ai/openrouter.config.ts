export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  enableZdrChat: boolean;
  enableZdrStt: boolean;
}

export function resolveOpenRouterConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY environment variable is required');
  return {
    apiKey,
    baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    defaultModel: process.env.OPENROUTER_MODEL ?? 'mistralai/mistral-small-2603',
    enableZdrChat: process.env.ENABLE_ZDR_CHAT === 'true',
    enableZdrStt: process.env.ENABLE_ZDR_STT === 'true',
  };
}
