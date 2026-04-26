# Stage 3 — Implement

**Agent**: developer
**Date**: 2026-04-26

## Changes delivered

### packages/types/src/index.ts
- Added `prefetchedQuestion: string | null` to `InterviewSessionSummary` interface.
- Updated test fixtures in `index.test.ts` to include the new field.

### apps/api/src/interview/interview.types.ts
- `summarizeInterviewSession`: pass `prefetchedQuestion ?? null` through.
- `InterviewStore`: added `purgeCompletedBefore(cutoffIso: string): number`.

### apps/api/src/interview/interview.store.ts
- `normalizeSession`: normalise `prefetchedQuestion` from persisted JSON.
- `purgeCompletedBefore`: removes sessions where `completedAt < cutoffIso`, returns count.

### apps/api/src/interview/interview.service.ts
- `startSession`: initialise `prefetchedQuestion: null`.
- `prefetchNextQuestion(userEmail, sessionId)`: non-streaming LLM call; stores result in session, best-effort (never throws).
- `streamAIResponse`: if `prefetchedQuestion` is set, short-circuit with stored answer (emits single chunk + done), clears field.

### apps/api/src/interview/interview.controller.ts
- Added `POST sessions/:sessionId/prefetch` endpoint calling `prefetchNextQuestion`.

### apps/api/src/interview/interview-purge.service.ts (new)
- `InterviewPurgeService` implements `OnModuleInit` / `OnModuleDestroy`.
- Runs `purgeCompletedBefore` at init and every 24 h via `setInterval`.
- Computes cutoff as `now - AUDIO_RETENTION_DAYS * 86_400_000`.

### apps/api/src/interview/interview.module.ts
- Extracted `INTERVIEW_STORE` token to share store between `InterviewService` and `InterviewPurgeService`.
- Registered `InterviewPurgeService` as provider.

### apps/api/src/privacy/privacy.types.ts
- Extended `status` union to `"planned" | "implemented"`.

### apps/api/src/privacy/privacy-retention-policy.ts
- Updated `audioPurgePlan.status` to `"implemented"` with accurate execution note.

### apps/app/app/interview/interview-studio.tsx
- Added `audioBlobUrlRef` to capture an Object URL from raw blobs before WAV conversion.
- Revoke URL on `resetSession` to avoid memory leaks.
- Render `<audio controls>` in the report card when session is completed and blob URL exists.
- Fixed `canStartInterview` to remove `Boolean(applicationId)` guard (free practice mode).
- Candidature `<select>` now has "Aucune (mode pratique libre)" as first option.
- Hint text updated to reflect free practice context.
- After LLM `done` SSE event, `triggerPrefetch(sid)` fires fire-and-forget.

### apps/api/src/interview/interview-purge.service.test.ts (new)
- 5 tests covering: init cutoff accuracy, purge return value, interval clearance, double-destroy safety, session fixture validity.

## Quality gates
- `pnpm build`: ✅ types + api + app all clean
- `pnpm test`: ✅ 239 API + 201 app + 6 types = 446 tests passed
- `pnpm lint`: ✅ 0 warnings, 0 errors
- Coverage: purge service is new code, 5 tests cover all branches (init, purge, destroy × 2, fixture).

## PR size estimate
~170 lines net added (well within 400-line limit).
