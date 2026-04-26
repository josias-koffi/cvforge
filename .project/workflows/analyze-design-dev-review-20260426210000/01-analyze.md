# Stage 1 — Analyze

**Agent**: product-owner
**Date**: 2026-04-26

## Scope Decision

US-050 closes four functional gaps in the interview module, all rooted in vision §10, §15.5, and §16 (V1.2 roadmap).

### 1. Réécoute audio + transcription disponibles (§10.7)
MinIO is not yet wired. Audio replay is scoped to **browser-side Object URL playback**: the WAV blob is already created in `blobsToWavBase64`; we retain a second Object URL from the raw blobs before conversion and expose an `<audio>` element in the completed-session UI.
Transcription text is already rendered — no backend change needed.
**Acceptance test**: session completes → audio element visible and playable.

### 2. Mode pratique libre (§10.8)
The current `canStartInterview` gate requires `Boolean(applicationId)`. The backend already accepts `applicationId = null`. The fix is to remove that UI constraint and add an explicit "Aucune (mode pratique)" `<option>` at the top of the candidature selector.
**Acceptance test**: user can start and finish an interview session without selecting a candidature.

### 3. Purge automatique audio RGPD (§15.5)
`PRIVACY_RETENTION_POLICY` declares the 30-day purge as "planned". We implement a NestJS `InterviewPurgeService` (no BullMQ — a plain `setInterval` at 24h is sufficient for the file store) that removes completed sessions from the file store where `completedAt` is older than `AUDIO_RETENTION_DAYS`. Update the policy status to `"implemented"`.
**Acceptance test**: service exists, is registered in InterviewModule, and tested to delete expired sessions.

### 4. Pré-génération question suivante (§10.3 Opt.3, §16 V1.2 avancé)
Vision marks this as V1.2 advanced; sprint asks "si la latence le permet". We implement it:
- Add `prefetchedQuestion: string | null` to `InterviewSessionSummary`.
- Backend: `POST sessions/:sessionId/prefetch` — generates next question via LLM (non-streaming), stores result in session.
- Frontend: after the TTS "done" SSE event, fire-and-forget `/prefetch`. On next recording stop → if `prefetchedQuestion` is set, short-circuit the `/respond` SSE call and use it directly.
**Acceptance test**: prefetch endpoint exists, stores question, frontend uses it when available.

## Open Questions
- Browser audio replay via Object URL is transient (lost on page reload). Acceptable for MVP — persisted audio belongs to a future MinIO story.
- RGPD purge targets `completedAt` timestamp; sessions without `completedAt` are not purged (they remain recoverable).
