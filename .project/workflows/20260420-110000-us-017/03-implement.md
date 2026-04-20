# Stage 3 — Implement

**Agent**: Developer
**Date**: 2026-04-20

## Changes made

### New files

| File | Description |
|------|-------------|
| `apps/api/src/ai/openrouter.config.ts` | Config factory — resolves `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL` from env; throws early if API key is missing |
| `apps/api/src/ai/openrouter.service.ts` | `OpenRouterService` — `chat(messages, options?)` method; hardcodes `zdr: true`, `transforms: []`, `provider: { only: ['Mistral'], allow_fallbacks: false }` as constants (not configurable) |
| `apps/api/src/ai/openrouter.module.ts` | NestJS module following SmtpModule pattern; exports `OPENROUTER_SERVICE` symbol token |
| `apps/api/src/ai/openrouter.config.test.ts` | 6 unit tests for config factory |
| `apps/api/src/ai/openrouter.service.test.ts` | 12 unit tests for the service (ZDR, transforms, provider, model override, temperature, endpoint, auth header, success, HTTP error, empty choices) |

### Modified files

| File | Change |
|------|--------|
| `apps/api/src/app.module.ts` | Added `OpenRouterModule` import |
| `apps/api/src/app.module.test.ts` | Updated assertion to include `OpenRouterModule` |

### No new library introduced

Used native `fetch` (Node 20 built-in). No ADR needed.

## RGPD invariants enforced in code

```typescript
const ZDR_PAYLOAD = {
  zdr: true,
  transforms: [],
  provider: { only: ['Mistral'], allow_fallbacks: false },
} as const;
```

These values are `const` in the service file, not driven by environment variables or caller options.

## Quality gates

| Gate | Result |
|------|--------|
| `pnpm --filter api lint` | ✅ 0 warnings, 0 errors |
| `pnpm --filter api test` | ✅ 59/59 tests pass |
| `src/ai` line coverage | ✅ 100% |
| `src/ai` branch coverage | ✅ 100% |
| Overall line coverage | ✅ 89.88% (threshold: 80%) |
| Overall branch coverage | ✅ 83.25% (threshold: 70%) |
| No new dependency | ✅ native fetch only |

## Coverage impact

New code coverage: 100% lines / 100% branches (exceeds 90% new-code threshold from spec §2).

## Verdict

✅ All acceptance criteria are implemented and testable. No blocking engineering issues.
