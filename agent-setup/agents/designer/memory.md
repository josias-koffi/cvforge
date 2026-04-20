<!-- generated-by: /init-project -->
<!-- vars: ROLE_TITLE, STACK, ARCHITECTURE_STYLE, TODAY_ISO -->

# Memory — Designer

> Append-only journal. Most recent entry at the bottom.
> Every agent action writes here per the memory protocol in CLAUDE.md.

## 2026-04-18 — init

- **Did**: Initialised agent definition and empty memory.
- **Why**: Project bootstrap.
- **Learned**: Stack detected as node. Architecture: monorepo (source: vision §2).
- **Open**: See `.project/state.json > clarifications_pending`.

## 2026-04-19 — US-006

- **Did**: Defined the first "Papier & Crayon" token set and documented a mobile-first base shell using centralized palette, typography, and spacing roles.
- **Why**: Sprint `US-006` required the visual foundations to exist before component-library customization work can start.
- **Learned**: A shared token file plus CSS custom properties is enough to propagate the art direction across both Next apps without adding new tooling.
- **Open**: Later stories should extend the token usage into forms, navigation, and the authenticated dashboard shell.

## 2026-04-19 — US-007

- **Did**: Specified the first reusable primitive set and aligned it with the existing "Papier & Crayon" token layer through a shared style injector and mobile-first surface rules.
- **Why**: The component library needed a concrete visual and accessibility brief before implementation.
- **Learned**: The token system is flexible enough to support shadcn-style primitives without introducing app-local visual drift.
- **Open**: Navigation and dashboard stories should reuse the same card, button, and form primitives rather than inventing new patterns.

## 2026-04-19 — US-008

- **Did**: Specified a dual-mode navigation shell with a mobile bottom bar, a `lg` desktop sidebar, and semantic nav landmarks that preserve the existing "Papier & Crayon" feel.
- **Why**: The sprint story required a responsive navigation system that works across the current Next apps without fragmenting the shared UI language.
- **Learned**: The existing token system already provides enough structure for both compact mobile navigation and a richer desktop sidebar treatment.
- **Open**: Future authenticated screens should inject task-specific content into this shell instead of forking the layout.

## 2026-04-19 — smtp backend setup

- **Did**: Reviewed the SMTP setup task and explicitly marked the design stage as a non-UI skip while documenting the intended infrastructure shape.
- **Why**: The workflow requires a design-stage artifact even when the requested work does not affect user-facing experience.
- **Learned**: The current email setup request is purely backend infrastructure and does not create any new UX or accessibility surface yet.
- **Open**: A later email-auth or notifications story may need actual user-facing copy and delivery-state UX.

## 2026-04-19 — US-009

- **Did**: Specified a minimal three-step passwordless flow covering login request, generated-link preview, and post-consumption session verification, while keeping the UI intentionally narrow.
- **Why**: The sprint story needed enough UX to prove the auth flow end to end without inventing later dashboard, admin, or invitation surfaces.
- **Learned**: A compact flow with explicit copy about the temporary link-preview behavior is enough to validate the auth contract and remain honest about current delivery capabilities.
- **Open**: A future story should replace the preview step with real email delivery status once the SMTP-backed mailer exists.

## 2026-04-19 — US-010

- **Did**: Reviewed the first-admin bootstrap story and explicitly recorded the design stage as a non-UI skip with a backend-only technical shape.
- **Why**: The workflow still requires a design artifact even when the requested change does not alter any user-facing surface.
- **Learned**: The current passwordless flow can absorb one-time admin bootstrap rules without any new screen, copy, or accessibility work.
- **Open**: Admin invitation and route-protection stories may create the first actual admin-facing UX surfaces.

## 2026-04-20 — US-011

- **Did**: Specified a dedicated invitation acceptance page that exposes the invited email, role, expiry, and a single acceptance action while explicitly skipping the not-yet-built admin panel UI.
- **Why**: The story needed one consumable user-facing surface so the invitation link could work end to end without inventing future admin screens.
- **Learned**: A minimal invitation page is enough to satisfy the vision's "special registration page" requirement while staying aligned with the existing passwordless session flow.
- **Open**: The later admin-panel story should provide a proper invitation generation UI on top of this API contract.

## 2026-04-20 — US-012

- **Did**: Specified a minimal protected-route UX with the authenticated dashboard on `/`, an admin-only `/admin` surface, and a public `/forbidden` fallback for non-admin users.
- **Why**: The rerun needed a concrete route-level interaction design without prematurely designing the full admin panel.
- **Learned**: A small denial page plus server-side redirects are enough to satisfy the current authorization story while keeping the "Papier & Crayon" tone consistent.
- **Open**: The future admin panel should reuse the same denial pattern for any deeper privileged subroutes.

## 2026-04-20 — US-013

- **Did**: Specified a mobile-first five-step onboarding flow with visible progress, local resume affordance, and a final recap step that allows section-by-section correction before validation.
- **Why**: The story required a concrete UX pattern that matches the vision while fitting inside the existing authenticated shell and shared design primitives.
- **Learned**: The current `AppShell` and card primitives are sufficient for a usable wizard without inventing a second layout system.
- **Open**: `US-014` should decide how the onboarding completion state transitions into the editable base-profile screen.

## 2026-04-20 — US-014

- **Did**: Specified a protected `/profile` screen with a consultation summary, stacked editing sections, onboarding-seeded defaults, and no multi-profile controls.
- **Why**: The story needed a focused UX that satisfies the vision sections while preserving the sprint rule of a single profile in MVP.
- **Learned**: The existing shell and card system can support a fairly dense profile editor as long as the page stays vertically structured and clearly segmented.
- **Open**: Later CV-generation work should decide how this profile transitions from structured form data into the editor/template pipeline.

## 2026-04-20 — US-015

- **Did**: Marked the design stage as a non-UI data-contract task and specified a prompt-safe profile shape with explicit omission and reinjection metadata.
- **Why**: The workflow still required a design decision even though the story changes backend-facing data semantics rather than a user-facing screen.
- **Learned**: A pure helper contract is the least risky way to encode RGPD prompt rules now because it can be reused by future CV, letter, and interview flows without UI duplication.
- **Open**: Later AI surfaces should expose only explanatory copy if users need visibility into what data is withheld from prompts.

## 2026-04-20 — US-016

- **Did**: Specified mandatory consent checkboxes and inline error feedback on both signup surfaces, plus invisible data guardrails for URLs, phone numbers, dates, and bounded text inputs.
- **Why**: The story needed a minimal UX that makes consent explicit without adding new screens, while keeping the data-entry experience safe for the current MVP.
- **Learned**: The existing auth pages can absorb RGPD consent and validation affordances with small copy and form changes instead of a new registration flow.
- **Open**: The future legal copy should replace the placeholder wording once the real CGU and privacy policy are written in sprint `009`.

## 2026-04-20 — US-017

- **Did**: Marked the design stage as a non-UI skip; provided architecture notes for the developer on module layout and the RGPD invariant payload shape.
- **Why**: The story is pure backend infrastructure with no user-facing surface.
- **Learned**: Infrastructure stories still benefit from a design artifact that clarifies the API contract for the developer handoff, even when no screen or interaction is involved.
- **Open**: Future AI features that build on `OpenRouterService` may need UX for loading states, error feedback, and credit consumption affordances.

## 2026-04-20 — US-018

- **Did**: Specified a protected `/candidatures` import screen with a single URL field, deterministic success and error states, and vertically structured draft cards for the extracted offer data.
- **Why**: The story needed a concrete UX shape that supports offer ingestion now without inventing the later full pipeline table, filters, or editor workflow.
- **Learned**: A server-rendered submit/redirect pattern is enough for this MVP slice and avoids unnecessary client-state complexity while preserving accessibility.
- **Open**: The later candidature pipeline story should decide when this page evolves from draft-creation flow into the full list/table management screen from the vision.

## 2026-04-20 — US-019

- **Did**: Extended the `/candidatures` UX with a labeled pasted-text fallback beneath the URL import and documented the PDF MVP deferral as static explanatory copy.
- **Why**: The workflow needed a usable fallback without hiding options behind tabs or inventing a misleading PDF-upload surface.
- **Learned**: The current card layout can support two ingestion modes clearly as long as they are framed as alternatives to the same draft-creation action.
- **Open**: The future PDF story should decide whether the UX starts from upload-first, drag-and-drop, or a more guided import step.

## 2026-04-20 — US-020

- **Did**: Defined a status-management UX on `/candidatures` with badge-like current-state display, only-valid next-transition buttons, visible timestamped history, and KPI cards reused by `/dashboard`.
- **Why**: The workflow needed a concrete interaction pattern that exposes the candidature pipeline clearly without pretending the full fiche candidature or chart suite already exists.
- **Learned**: Rendering only the allowed next transitions keeps the MVP comprehensible and prevents the UI from drifting away from the enforced business rules.
- **Open**: A later dashboard story can replace the simple KPI cards with richer charts without changing the underlying status contract.

## 2026-04-20 — US-021

- **Did**: Produced a component-level design brief for the new CV/LM document blocks, centered on print-safe semantic structure and a shared registry for future admin and user surfaces.
- **Why**: The workflow still required an explicit design decision even though this story delivers reusable blocks more than a new screen.
- **Learned**: The "Papier & Crayon" direction is best preserved here with restrained document styling so later templates can still differentiate visually.
- **Open**: `US-024` should decide how preview data and live rendering layer on top of this shared block registry.
