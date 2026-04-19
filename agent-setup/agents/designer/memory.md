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
