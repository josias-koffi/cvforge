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
