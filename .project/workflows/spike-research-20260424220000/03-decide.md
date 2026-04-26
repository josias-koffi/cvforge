# Stage 3 — Decide

**Agent**: tech-lead
**Date**: 2026-04-24

## Decision: PROCEED

The spike findings and implemented optimizations are architecturally sound. The two critical changes — latency instrumentation and auto-trigger of AI generation — are coherent with the existing session-first pipeline and introduce no new dependencies or ADR-scope additions.

## Rationale

1. **Instrumentation is strictly additive**: `performance.mark/measure` is a browser standard API. No new library. No ADR needed. The latency panel is a dev/observability surface that belongs in the Interview Studio.

2. **Auto-trigger is the correct default**: Manual triggering made the < 1.2 s KPI unmeasurable. The fix (chain `uploadWav → streamAIResponse` in `recorder.onstop`) is a small control-flow change in the frontend with no API surface changes. The "Relancer" fallback button preserves the recoverable path for STT errors.

3. **Architecture is clean**: All changes are within the Interface layer (React component). The Domain (session/chunk types), Application (interview.service.ts), and Infrastructure (OpenRouter calls) remain untouched.

4. **Latency target is achievable at median but not guaranteed at P95**: Estimated median ~750 ms, worst-case ~1350 ms. The gap at P95 is due to OpenRouter network variability, not code quality. Documented in the spike. Acceptable for V1.2 shipping — the instrumentation will reveal the real distribution.

5. **No new dependencies**: No ADR required.

## Risks Accepted

- P95 perceived latency may exceed 1200 ms under OpenRouter congestion. Mitigation: direct Mistral API integration can be explored as a follow-up if instrumentation confirms this.

## Next Action

Mark US-047 complete. The instrumentation will reveal real latency numbers in production. If P95 > 1.5 s after data collection, open a follow-up story to switch from OpenRouter to a direct Mistral API endpoint.
