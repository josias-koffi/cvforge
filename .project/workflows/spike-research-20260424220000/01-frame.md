# Stage 1 — Frame

**Agent**: analyst
**Date**: 2026-04-24

## Research Question

How can the perceived latency of the interview loop (T0 = user stops speaking → T1 = first AI audio utterance starts) be measured and pushed below 1.2 s, given the current browser-VAD → WAV conversion → STT (Voxtral) → LLM streaming → TTS pipeline?

## Time Box

4 hours (investigation + implementation of instrumentation + critical optimizations).

## Scope

**In scope**:
- Current pipeline from `recorder.onstop` to first `SpeechSynthesisUtterance` play
- Latency instrumentation (client-side timestamps for each pipeline segment)
- Auto-trigger of AI generation after STT completes (removes manual step)
- Identification of the two highest-impact latency reduction opportunities

**Out of scope**:
- Replacing OpenRouter/Voxtral with a self-hosted model
- WebRTC or binary streaming protocols
- Multi-turn conversation state management

## Hypotheses

1. **Manual button is the single largest contributor**: the current UI requires the user to click "Generer la reponse IA" after recording. This adds unbounded human latency and makes the < 1.2 s target impossible to measure today.
2. **WAV conversion cost**: `blobsToWavBase64` (AudioContext decode + resample + base64) adds ~50–300 ms for short clips.
3. **STT round-trip via OpenRouter**: Voxtral Small inference is the dominant external latency (~300–800 ms depending on load).
4. **LLM TTFT**: Mistral Small via OpenRouter with maxTokens=120 yields first token in ~150–400 ms.

## Pass Criteria

- Research question is specific ✅
- Time box is explicit ✅
