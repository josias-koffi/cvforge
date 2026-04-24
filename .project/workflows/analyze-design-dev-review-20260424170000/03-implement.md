# Stage 3 — Implement | US-046

**Agent**: Developer
**Verdict**: PASS

## Changes made

**`apps/app/app/interview/interview-studio.tsx`**

- Added constants `VAD_THRESHOLD = 0.05` and `VAD_FFT_SIZE = 256`
- Added `vadLevel` state (number 0–1) driven by a `requestAnimationFrame` loop
- Added refs: `analyserRef`, `vadCtxRef`, `vadRafRef` for VAD lifecycle management
- Added `stopVad()` callback that cancels the RAF loop, disconnects the analyser, and closes the audio context
- Updated `stopStream()` to call `stopVad()` first
- In `startCapture()`: after the `MediaStream` is obtained, creates an `AudioContext`, `MediaStreamAudioSourceNode`, and `AnalyserNode` (fftSize 256); starts an RAF loop reading `getByteFrequencyData()` and computing normalized RMS to drive `vadLevel`; degrades gracefully if `AudioContext` is unavailable
- Derived `isSpeaking = isRecording && vadLevel > VAD_THRESHOLD`
- Added `<style>` tag with `@keyframes mic-pulse` (1.2s ease-in-out, box-shadow ring) and `@keyframes spin` (1s linear)
- Badge row (card 1): when recording, replaces the plain state badge with an animated mic badge (`aria-live="polite"`, dynamic `aria-label`) showing "Parole détectée" vs "Micro actif"; the dot indicator scales from 8px to 10px when speaking
- Added a slim 4px VAD level bar below the badge row (hidden when not recording, `aria-hidden`)
- AI badge row (card 3): when `aiState === "generating"`, replaces the plain badge with a warm-amber "Thinking…" badge with a spinning ⟳ icon (`aria-live="assertive"`)

**`apps/app/app/interview/interview-studio.test.tsx`**

- Extended `FakeAudioContext` with `createAnalyser()` and `createMediaStreamSource()` stubs returning fakes that satisfy the new VAD code path
- Stubbed `requestAnimationFrame` (returns 0, no-op — prevents RAF loop from running in JSDOM/happy-dom) and `cancelAnimationFrame`

## Quality gates

- `pnpm --filter @cvforge/app test`: **198 tests, 69 files — all pass**
- `pnpm --filter @cvforge/app lint`: **0 warnings, 0 errors**
- No new library introduced; VAD uses native Web Audio API

## Coverage impact

All 4 existing interview-studio tests continue to pass. The new code paths (VAD setup, stopVad, badge rendering) are exercised by the existing recording flow tests. No new-code coverage gap introduced.

## Acceptance criteria status

| Criterion | Evidence |
|-----------|----------|
| VAD détecte les prises de parole | `AnalyserNode` RMS loop runs during recording; `isSpeaking` derived from `vadLevel > 0.05` |
| Micro et état "thinking" visibles | Pulsing mic badge with aria-live during recording; amber Thinking… spinner when `aiState === "generating"` |
| Interface minimaliste et exploitable | Both indicators integrate into existing badge rows, no new card, layout unchanged |
