# Stage 1 — Analyze
Agent: product-owner
Date: 2026-05-07

## Scope

US-063 introduces a dedicated multi-step setup screen at `/interview/new` that sits **before** the interview studio. The current `/interview` page mixes setup selectors with the full recording studio, violating the Sprint 017 goal of separating session configuration from the active interview experience.

## Current state
- `/interview/page.tsx` renders `InterviewStudio` which already embeds candidature selector, profile selector, and language select as inline form controls.
- `/interview/[sessionId]/route.ts` is an API Route Handler (GET) — no page component exists at this path.
- The interview studio logic lives in `interview-studio.tsx` (client component).

## Scope boundary
US-063 delivers:
1. `/interview/new` — 3-step wizard page (Server Component shell + Client Component stepper).
2. `/interview/[sessionId]/page.tsx` — minimal page shell rendering the existing `InterviewStudio` in session-mode (needed so the CTA redirect target exists). Full studio refactor is US-064.
3. `?candidatureId=` URL param support on `/interview/new` to pre-select the candidature.
4. A "Démarrer l'entretien" button in `/candidatures/[id]` detail that links to `/interview/new?candidatureId=[id]`.

**Out of scope for US-063:**
- VAD-auto (US-064)
- Redis messages continuity (US-065)
- Report screen (US-066)
- Any change to the NestJS API

## Acceptance criteria (verified testable)
1. GET `/interview/new` renders without auth error; wizard steps are visible.
2. `?candidatureId=X` pre-selects candidature X in step 1 (verified by rendered selected value).
3. Step 2 shows recruiter profile cards (≥ 5 profiles from vision §10.4).
4. Step 3 shows language selector (FR / EN) and difficulty selector (same as existing profiles).
5. "Démarrer" POST creates session via `/interview/start` and redirects to `/interview/[sessionId]`.
6. `/interview/[sessionId]` page renders the existing `InterviewStudio` pre-loaded with the session.
7. Candidature detail page `/candidatures/[id]` has a "Préparer un entretien" button linking to `/interview/new?candidatureId=[id]`.

## Product questions — none blocking
- Difficulty is mapped to the existing `InterviewRecruiterProfile` enum (standard/aggressive/passive/technical/behavioral); no new data model needed.

## Pass verdict: Scope is clear, all ACs are testable. Proceed to Design.
