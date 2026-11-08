# ADR-030: Text calls go through the Vercel AI SDK, with Claude available directly

Date: 2026-11-08
Status: accepted

Complements ADR-026 (voice stays on OpenAI Realtime). ADR-009 is unchanged: OCR
stays local, and only pseudonymised text reaches a model.

## Context

The owner holds prepaid Claude API credit and wants to spend it on CV writing,
analysis and import, without losing OpenRouter and without touching the
feature code. The model per feature was only configurable through environment
variables, of which the deployment forwards three.

Every text feature already went through `OpenRouterService.chat()` with a
`feature` tag, so one seam was enough.

## Decision

- `chat()` keeps its signature. Behind it, each attempt runs through `generateText`
  from the AI SDK v7 with `@ai-sdk/anthropic` or `@openrouter/ai-sdk-provider`.
  Our own chain and retries stay the only ones (`maxRetries: 0`).
- The table `ai_feature_models` holds the admin's model per feature. No row means
  the deployment's chain, so an empty table changes nothing.
- A chosen model goes first, followed by the OpenRouter chain. A permanent failure
  moves on when the next target is at another provider: Claude out of credit or a
  revoked key hands over instead of failing the candidate's request.
- Cost is OpenRouter's charged `usage.cost`, and for Claude a computation from the
  rates in `packages/types/src/ai-models.ts`, on the requested model.

## Consequences

- The AI SDK v7 is ESM-only and the API is CommonJS. It loads through Node's
  `require(esm)`, so the API needs Node 22.12 or later; `docker/api.Dockerfile`
  is on `node:22-alpine` (22.23 when checked).
- Current Claude models reject `temperature` and reason by default, which counts as
  output. `anthropic.profiles.ts` sets an output floor and an effort per feature.
- A standard key cannot read the Anthropic balance. The admin types the balance
  read on the console in `/admin/ai-models`; the cockpit counts down the calls
  recorded since that entry, and shows the result as an estimate.
- Rates are maintained by hand and must follow Anthropic's published list.
- The privacy policy must name Anthropic before a feature is switched to Claude.
- `OpenRouterService` now has a misleading name; renaming it touches seven modules
  and was left out of this change.

## Alternatives considered

- **`@anthropic-ai/sdk` next to the existing fetch**: no ESM concern and no change
  to the OpenRouter path, but one more adapter per future direct provider. The
  owner chose a single path.
- **AI SDK for direct calls only**: lower regression risk, two paths to maintain.
- **Moving the API to ESM**: out of proportion with the need.
- **Claude Vision for OCR**: scanned CVs would leave the server unpseudonymised,
  against ADR-009.
