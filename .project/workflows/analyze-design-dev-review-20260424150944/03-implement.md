# Implement

Implemented a full first-pass interview STT slice across `types`, `api`, and `app`.

Key changes:
- added shared interview session/chunk contracts in `packages/types`
- extended `OpenRouterService` with audio transcription support using `input_audio`
- added Nest `InterviewModule` with file-backed session store, authenticated controller, chunk idempotency, transcript aggregation, and recoverable error states
- added Next interview proxies plus protected `/interview` page
- built a client `InterviewStudio` using `MediaRecorder` 500ms chunks, session-storage resume, and chunk status display

Validation run:
- `pnpm --filter @cvforge/types test`
- `pnpm --filter @cvforge/api test`
- `pnpm --filter @cvforge/app test -- interview`
- `pnpm --filter @cvforge/api lint`
- `pnpm --filter @cvforge/api build`
- `pnpm --filter @cvforge/app lint`
- `pnpm --filter @cvforge/app build`

Coverage impact: targeted tests were added for the new contracts, OpenRouter audio path, interview service/controller, Next proxies, page render, and browser recorder behavior.
