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

## 2026-04-19 — US-009

- **Did**: Confirmed that `US-009` is limited to the passwordless login contract itself, defined the acceptance boundary around a working magic-link flow plus secure sessions, and captured the still-open product decision on final session duration.
- **Why**: The workflow needed a precise scope so implementation could deliver auth fundamentals without spilling into first-admin bootstrap or role-based authorization.
- **Learned**: The vision allows the sprint to ship with a configurable recommended session duration while keeping the exact final value as a product follow-up.
- **Open**: Real email delivery still needs to be connected to the existing SMTP setup in a future story.

## 2026-04-19 — US-010

- **Did**: Confirmed that `US-010` is strictly the one-time first-admin bootstrap inside the existing passwordless flow and kept invitations and route protection out of scope.
- **Why**: The workflow needed a product boundary that made each acceptance criterion directly testable without inventing extra admin features.
- **Learned**: The vision requires persistent bootstrap state; otherwise the first-admin guarantee would not survive a restart.
- **Open**: `US-011` still needs a separate invitation mechanism rather than extending public signup semantics.

## 2026-04-20 — US-011

- **Did**: Confirmed that `US-011` stays limited to admin-generated nominative invitations with 48-hour expiry and a consumable invitation-specific registration path.
- **Why**: The workflow needed a strict boundary so the story would deliver invitation mechanics without prematurely building the full admin panel or broader user-management flows.
- **Learned**: The vision is precise enough to ship the invitation contract now while keeping `/admin` protection and admin UI for the next story.
- **Open**: `US-012` still needs to protect the future admin surface and centralize authorization checks.

## 2026-04-20 — US-012

- **Did**: Prioritized the confirmed authorization gap to remain in sprint `003` and documented that the task cannot be completed through the currently assigned `bug-triage` workflow.
- **Why**: The product-owner stage needed an explicit sprint decision and a clear next action once triage confirmed the gap.
- **Learned**: The story scope still matches the vision, but the workflow metadata does not match the delivery work required.
- **Open**: Reassign `US-012` to an implementation workflow, then rerun it.

## 2026-04-20 — US-012 implementation

- **Did**: Reframed `US-012` under the implementation workflow with explicit acceptance mapping for a protected dashboard route, an admin-only route, and tested authorization behavior.
- **Why**: The rerun needed a scope definition that stayed inside the vision while turning the previously triaged gap into implementable work.
- **Learned**: The story can be completed without inventing the full admin panel by shipping a minimal `/admin` surface plus route guards.
- **Open**: The future admin-panel story can now build on the guarded route instead of starting from a public surface.
