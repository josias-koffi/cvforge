<!-- generated-by: /init-project -->
<!-- vars: ROLE_TITLE, STACK, ARCHITECTURE_STYLE, TODAY_ISO -->

# Memory — Analyst

> Append-only journal. Most recent entry at the bottom.
> Every agent action writes here per the memory protocol in CLAUDE.md.

## 2026-04-18 — init

- **Did**: Initialised agent definition and empty memory.
- **Why**: Project bootstrap.
- **Learned**: Stack detected as node. Architecture: monorepo (source: vision §2).
- **Open**: See `.project/state.json > clarifications_pending`.

## 2026-04-18 — sprint-001-monorepo-setup

- **Did**: Rewrote `sprints/backlog.md` and `sprints/sprint-001.md` with cited setup work, then scaffolded the `pnpm`/`turbo` monorepo, shared packages, and Docker baseline.
- **Why**: Resolve the repository-level command clarifications and align Sprint 001 with the MVP setup described in the vision.
- **Learned**: The vision is specific enough to answer the initial repo command questions without inventing stack details; runtime verification still depends on installing dependencies.
- **Open**: CI workflows, concrete lint/test toolchain wiring, and the full "Papier & Crayon" design system remain to be implemented.

## 2026-04-18 — roadmap-backlog-sprint-plan

- **Did**: Produced a cited spike from `.project/vision.md`, rewrote `sprints/backlog.md` around KPI-backed epics, and created `sprints/sprint-002.md` through `sprints/sprint-014.md` to cover MVP, V1.1, V1.2, and V2.0.
- **Why**: The project needed a complete delivery plan aligned with the full vision instead of the initial bootstrap-only backlog.
- **Learned**: The vision is detailed enough to sequence delivery without inventing scope, but several implementation choices remain open around email, sessions, DOCX, and some V2 integrations.
- **Open**: Provider email, final session duration, DOCX library choice, and the exact go/no-go threshold for fallback PDF import and interview latency enforcement.

## 2026-04-24 — US-047

- **Did**: Framed and investigated the perceived-latency spike for the interview loop; identified the manual AI-trigger button as the primary blocker and the absence of instrumentation; implemented `performance.mark/measure` at 5 pipeline checkpoints and auto-trigger of `streamAIResponse` after STT completes; documented median estimate ~750 ms, P95 risk ~1350 ms.
- **Why**: Sprint 013 required that the < 1.2 s latency target be measurable and demonstrably met or the gap documented.
- **Learned**: Removing the manual trigger is the single highest-ROI change; it transforms an unmeasurable KPI into an instrumented, sub-1-second median pipeline.
- **Open**: Production instrumentation data needed to confirm P95 distribution; if P95 > 1500 ms, escalate to a direct Mistral API integration story.

## 2026-04-24 — US-040

- **Did**: Framed and investigated the recruiter-search story, then documented a scoped `V1.1` flow in `.project/spikes/SPIKE-003-recruiter-search.md` and the workflow artifacts under `.project/workflows/spike-research-20260424122609/`.
- **Why**: Sprint `011` required either implementation or a precise, source-backed framing of recruiter search without inventing scope beyond the vision.
- **Learned**: The current candidature flow already provides the right anchor points; recruiter search should be an assisted step on an existing application, not a separate sourcing product.
- **Open**: Future implementation still needs a concrete persistence shape for recruiter contacts and a decision on which public search/provider boundary is acceptable operationally.
