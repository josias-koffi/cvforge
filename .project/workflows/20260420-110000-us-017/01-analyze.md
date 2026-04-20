# Stage 1 — Analyze

**Agent**: Product Owner
**Date**: 2026-04-20

## Scope

US-017 introduces the foundational OpenRouter integration in the NestJS API backend. It is a pure infrastructure story with no UI surface. The scope is:

1. A new `OpenRouterModule` in `apps/api/src/ai/` following the same config-as-factory pattern as `SmtpModule`
2. An `OpenRouterService` with a `chat()` method that **always** passes `zdr: true` and limits providers to Mistral
3. Registration in `AppModule`
4. Unit tests reaching ≥ 90% new-code coverage

**Out of scope**: prompt building, profile pseudonymization consumption, CV/LM generation (future stories), Voxtral TTS (V1.2), scraping (US-018).

## Acceptance Criteria (testable)

| # | Criterion | Verifiable by |
|---|-----------|---------------|
| 1 | Every request to the OpenRouter API includes `"zdr": true` in the JSON body | Unit test intercepting `fetch()` calls |
| 2 | No request body ever sets prompt-logging-enabling parameters; `transforms: []` or equivalent is present | Unit test asserting request body shape |
| 3 | Every request sets `provider.only = ["Mistral"]` (or equivalent) | Unit test asserting request body shape |

## Missing Product Questions

None — all constraints are fully specified in vision §15.2. The three acceptance criteria are directly derivable from the documented OpenRouter RGPD configuration table.

## Verdict

✅ Scope is clear. All acceptance criteria are testable. No blocking product questions.
