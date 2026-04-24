# Stage 1 — Analyze | US-046

**Agent**: Product Owner
**Verdict**: PASS

## Scope

US-046 adds browser-side Voice Activity Detection (VAD) and real-time visual feedback to the existing interview studio. The story is strictly additive to the `InterviewStudio` component delivered in US-044/045. No new routes, APIs, or data models are required.

## Acceptance criteria — testable mapping

| Criterion | Testable evidence |
|-----------|------------------|
| VAD détecte les prises de parole | `AnalyserNode` from the live `AudioContext` measures dB RMS each animation frame; the studio transitions to a `speaking` sub-state when the level exceeds the threshold |
| Micro et état "thinking" visibles | A dedicated mic indicator (pulsing/colored ring or icon) is visible during `recording`; an explicit "Thinking…" badge appears during `aiState === "generating"` |
| Interface minimaliste et exploitable | The new indicators must integrate into the existing two-card layout without adding a new card or nav level; the layout remains usable on 375 px wide screens |

## Product boundary

- **In scope**: VAD loop using `AnalyserNode`, mic pulse indicator, "Thinking" state badge, WCAG-compliant color signals.
- **Out of scope**: Server-side VAD, hotword detection, multi-speaker diarization, animated waveforms requiring a canvas/WebGL surface.

## No product blockers

Vision §10 and §16 explicitly require "retour visuel en temps réel" and a minimal observable interface. These criteria map exactly to what is deliverable now without new product decisions.

## Open questions

None blocking implementation. The threshold for speaking detection (−30 dBFS recommended default) is an implementation detail, not a product decision.
