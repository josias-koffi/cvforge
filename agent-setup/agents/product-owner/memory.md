<!-- generated-by: /init-project -->
<!-- vars: ROLE_TITLE, STACK, ARCHITECTURE_STYLE, TODAY_ISO -->

# Memory — Product Owner

> Append-only journal. Most recent entry at the bottom.
> Every agent action writes here per the memory protocol in CLAUDE.md.

## 2026-04-18 — init

- **Did**: Initialised agent definition and empty memory.
- **Why**: Project bootstrap.
- **Learned**: Stack detected as node. Architecture: monorepo (source: vision §2).
- **Open**: See `.project/state.json > clarifications_pending`.

## 2026-04-18 — backlog-dependency-refinement

- **Did**: Tightened `sprints/backlog.md` with an estimate scale, dependency matrix, technical gates, and an ADR watchlist, then added a delivery dependency spike.
- **Why**: The roadmap needed execution-oriented constraints before starting the next implementation sprint.
- **Learned**: The MVP critical path is narrower than the full roadmap and depends heavily on locking auth, pseudonymisation, and template infrastructure in the right order.
- **Open**: Provider email, session duration, and DOCX tooling still need explicit product decisions.

## 2026-04-19 — US-006

- **Did**: Confirmed the design-token story scope, acceptance criteria interpretation, and the absence of product blockers before implementation started.
- **Why**: `US-006` needed a precise boundary so the design-system work stayed limited to tokens and base-shell foundations already present in the vision.
- **Learned**: The vision is specific enough to define the first token set without adding new product requirements.
- **Open**: `US-007` still needs to translate these tokens into reusable `shadcn/ui` primitives.

## 2026-04-19 — US-007

- **Did**: Confirmed that `US-007` stays limited to shared base components in `packages/ui` and that the acceptance criteria can be verified through exports, rendered markup, and quality-gate evidence.
- **Why**: The workflow needed a clear product boundary before introducing the shadcn-style component layer.
- **Learned**: The existing vision and sprint criteria are precise enough to implement the first shared primitive set without inventing any new user flows.
- **Open**: `US-008` should now consume these primitives instead of creating navigation-specific UI styles from scratch.

## 2026-04-19 — US-008

- **Did**: Confirmed that `US-008` is strictly a shared-shell navigation story and that its acceptance criteria can be evidenced through shared UI code, breakpoint rules, and rendered markup.
- **Why**: The workflow needed a tight product boundary before turning the base shell into responsive app and landing navigation.
- **Learned**: The vision already implies a reusable shell pattern, so no extra product scope was needed to support both marketing and authenticated surfaces.
- **Open**: The next dashboard stories should populate this shell with real authenticated sections and data.

## 2026-04-19 — smtp backend setup

- **Did**: Framed the SMTP backend task as an ad hoc workflow item, defined testable acceptance criteria around env-driven configuration, and documented that the `US-003` reference does not match the current backlog.
- **Why**: The workflow needed a precise product boundary before implementation so the work stayed limited to backend configuration rather than inventing a full email-delivery feature.
- **Learned**: The requested outcome can be delivered as provider-neutral infrastructure with Resend only serving as the initial SMTP example.
- **Open**: Future product work still needs explicit decisions for sender identity, magic-link delivery behavior, and notification use cases.
