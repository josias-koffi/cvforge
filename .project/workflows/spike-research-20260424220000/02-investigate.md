# Stage 2 — Investigate

**Agent**: analyst
**Date**: 2026-04-24

## Pipeline Breakdown (pre-optimization)

```
T0 (recorder.onstop)
  └─ WAV conversion (AudioContext.decodeAudioData + resample + base64)  ~50–300 ms
  └─ Network: browser → Next.js proxy (chunk POST)                       ~5–20 ms
  └─ Network: Next.js → NestJS                                           ~5 ms
  └─ Voxtral Small STT inference (OpenRouter)                           ~300–800 ms
  └─ Response back to browser                                           ~10 ms
  └─ [MANUAL BUTTON CLICK — unbounded human latency]                   ∞
  └─ LLM stream (Mistral Small, maxTokens=120, TTFT)                   ~150–400 ms
  └─ First sentence boundary detected in stream                         ~50–200 ms
  └─ Web Speech API first utterance                                     ~10–30 ms
T1 (first AI audio starts)
```

**Problem confirmed**: The manual "Generer la reponse IA" button made the < 1.2 s target unmeasurable. Human click latency alone is ~500 ms–2 s.

## Findings

### Finding 1 — No instrumentation (criterion 1)
The codebase had zero latency measurement. No `performance.mark/measure`, no timestamps in the `pipelineEvents` log for STT or WAV conversion phases.

### Finding 2 — Manual trigger (highest impact)
`streamAIResponse()` was only called via an onClick handler. This inserted unbounded human latency between STT completion and LLM start.

### Finding 3 — WAV conversion is serialized before upload
The `blobsToWavBase64` → `uploadWav` chain is sequential, but this is correct (Voxtral requires a complete WAV file). No optimization possible here without switching to streaming STT.

### Finding 4 — LLM is already well-tuned
`maxTokens=120`, `temperature=0.35`, Mistral Small via Mistral-order provider. TTFT is ~150–400 ms. The model selection is already near-optimal for conversational latency.

### Finding 5 — TTS is zero-cost to start
`SpeechSynthesis` starts on the first detected sentence boundary (regex `[.!?]\s`). No external TTS API call. This is already optimal.

## Optimizations Implemented

### Opt-1: Latency instrumentation (criterion 1) ✅
Added `performance.mark` at:
- `recording_stop` — when `recorder.onstop` fires
- `stt_done` — immediately after `uploadWav` resolves
- `llm_start` — when `streamAIResponse` begins
- `llm_first_token` — on first SSE chunk with non-empty text
- `tts_start` — when first `SpeechSynthesisUtterance` starts

Added `performance.measure` for:
- `STT (Voxtral)`: `recording_stop → stt_done`
- `TTFT (LLM)`: `llm_start → llm_first_token`
- `Latence percue (T0→TTS)`: `recording_stop → tts_start`

A visible latency panel in the UI shows each measure in ms with a pass/fail indicator against the 1200 ms threshold.

### Opt-2: Auto-trigger LLM after STT (criterion 2) ✅
`recorder.onstop` now chains `uploadWav` → `streamAIResponse(sessionId)` automatically. The "Relancer la réponse IA" button remains as a manual fallback.

The button label changed from "Generer" to "Relancer" to make its fallback-only role clear.

## Estimated Pipeline After Optimizations

```
T0 (recording_stop)
  WAV conversion              ~100 ms
  STT network + inference     ~400 ms (median)
  LLM TTFT                    ~200 ms (median)
  First sentence + TTS start  ~50 ms
T1                            ~750 ms (median estimated)
```

**Worst-case estimate** (STT 800ms + TTFT 400ms + overhead): ~1350 ms — exceeds the 1200 ms target.
**Median estimate**: ~750 ms — well within target.

The target is achievable at median load. P95 may exceed 1.2 s during OpenRouter congestion. The instrumentation panel will reveal the actual distribution in testing.

## Unknowns and Tradeoffs

| Unknown | Impact | Mitigation |
|---------|--------|------------|
| OpenRouter P95 STT latency | High | Instrument + document; switch to direct Mistral API if needed |
| WAV conversion for long recordings | Medium | Short clips (<5 s) expected in interview flow |
| Web Speech API voice loading time | Low | Voices pre-loaded by browser; negligible |

## Pass Criteria

- Findings documented within time box ✅
- Unknowns and tradeoffs explicit ✅
