# Stage 01 — Analyze (Product Owner)

## Scope
US-064 refactors the Interview Studio (`apps/app/app/interview/interview-studio.tsx`) from a manual push-to-talk model to a fully automated VAD-driven recording session.

The `preloadedSessionId` prop (set when arriving from `/interview/[sessionId]`) is the discriminator: when set, auto-VAD mode activates; without it, the old `/interview` page keeps backward-compatible manual controls.

## Acceptance Criteria (testable)
1. Push-to-talk buttons absent in auto-VAD mode (DOM check)
2. `getUserMedia` called automatically on mount when `preloadedSessionId` provided
3. Four VAD status badges rendered with correct emoji labels
4. Mute toggle present and cycles state `listening ↔ muted`
5. Chat messages rendered as alternating user/AI bubbles from `session.chunks` and streamed AI text
6. `<div ref={transcriptEndRef}/>` scroll anchor at bottom of transcript
7. Session timer badge showing `MM:SS` format
8. "Fin de session" button appears in header (before transcript card in DOM)

## Product Questions
None — all criteria are clear and testable. The old `/interview` page will remain functional with manual controls when `preloadedSessionId` is absent.

## Risk
US-064 sprint note: suppress push-to-talk changes existing behavior — regression test for old flow needed.

**Pass** ✅
