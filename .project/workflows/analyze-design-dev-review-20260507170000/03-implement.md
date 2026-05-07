# Stage 03 — Implement (Developer)

## Files changed

### `apps/app/app/interview/interview-studio.tsx` (major refactor)
- **Added** `VadStatus` type: `"listening" | "recording" | "processing" | "muted"`
- **Added** `ChatMessage` type: `{ role: "user" | "ai"; text: string; ts: string }`
- **Added** `SILENCE_FRAMES_TO_STOP = 45` (~750ms silence threshold for auto-stop)
- **Added** state: `vadStatus`, `isMuted`, `messages`, `elapsedSeconds`
- **Added** refs: `vadStatusRef`, `isMutedRef`, `sessionIdRef`, `lastChunkCountRef`, `silenceFramesRef`, `transcriptEndRef`, `currentAiTextRef`
- **Added** `updateVadStatus()` helper to keep ref + state in sync
- **Added** `initMicStream()`: called automatically when `preloadedSessionId` is set; requests mic permission, starts AnalyserNode VAD loop with auto-recording state machine
- **Added** `autoStartRecording()`: called from VAD loop when speech detected; creates MediaRecorder, handles onstop → WAV conversion → upload → AI response → reset to `listening`
- **Modified** `hydrateSession()`: initializes `messages` from existing session chunks + last AI response; tracks `lastChunkCountRef`
- **Modified** `updateSession()`: syncs new transcript chunks as user messages; updates `sessionIdRef`
- **Modified** `streamAIResponse()`: tracks `currentAiTextRef`; appends finalized AI message to `messages` on `done` event
- **Modified** main `useEffect`: calls `initMicStream()` after hydration when `preloadedSessionId` is set
- **Added** auto-scroll `useEffect`: `scrollIntoView` on `transcriptEndRef` when `messages` changes
- **Added** session timer `useEffect`: `setInterval` keyed on session id; updates `elapsedSeconds`
- **New UI** (auto-VAD mode, `preloadedSessionId` set):
  - Header row with 4-state VAD badge (🟢🔴🟡⚫), timer `⏱ MM:SS`, profile/language info
  - Mute toggle button
  - "Fin de session" button at top (before transcript card)
  - Chat transcript with alternating user/AI bubbles, auto-scroll anchor
- **Backward compat** (no `preloadedSessionId`): all legacy controls preserved ("Demarrer"/"Arreter"/"Terminer la session", config selects, Textarea transcript)

### `apps/app/app/interview/[sessionId]/session/route.ts` (new)
- Moved from conflicting `[sessionId]/route.ts` to `[sessionId]/session/route.ts`
- Fixes Next.js routing conflict: `/interview/[sessionId]/page` + `/interview/[sessionId]/route` can't coexist

### `apps/app/app/interview/[sessionId]/route.ts` (deleted)
- Removed; replaced by `session/route.ts`

### `apps/app/app/candidatures/[id]/candidature-detail-tabs.tsx`
- Fixed `variant="outline"` → `variant="secondary"` (TypeScript build error from US-063)

### `apps/app/app/interview/interview-studio.test.tsx` (tests updated + new)
- Updated: session hydration URL → `/interview/${sessionId}/session`
- Added 8 new tests for auto-VAD behavior

## Quality gates
- `pnpm lint`: ✅ 0 errors
- `pnpm test`: ✅ 271/271 passing
- `pnpm build`: ✅ clean build

**Pass** ✅
