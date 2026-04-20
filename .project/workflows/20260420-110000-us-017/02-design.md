# Stage 2 — Design

**Agent**: Designer
**Date**: 2026-04-20

## Non-UI skip decision

US-017 is a pure backend infrastructure story (NestJS module + service + tests). There is no user-facing interface, screen, or interaction design involved.

**Decision: skip UI design — non-UI task confirmed.**

## Architecture design note (for developer handoff)

Although no UI is needed, the module structure must match the existing backend design patterns:

### Module layout

```
apps/api/src/ai/
├── openrouter.config.ts      # resolveOpenRouterConfig() factory
├── openrouter.service.ts     # OpenRouterService class (fetch-based)
├── openrouter.module.ts      # NestJS module with DI wiring
└── openrouter.service.spec.ts # Unit tests (vitest)
```

### Config factory contract (mirrors SmtpModule pattern)

```typescript
export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
}

export function resolveOpenRouterConfig(): OpenRouterConfig
```

### Service API surface

```typescript
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
}

export class OpenRouterService {
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>
}
```

### Hardcoded RGPD invariants (never configurable)

Every request body must always include:
```json
{
  "zdr": true,
  "transforms": [],
  "provider": { "only": ["Mistral"], "allow_fallbacks": false }
}
```

These values are constants in the service, **not** driven by environment variables or caller options, to make them auditable.

### No new library needed

Use native `fetch` (Node 20 supports it natively). No ADR required.

## Verdict

✅ Design fits analyzed scope. Non-UI skip decision is explicit.
