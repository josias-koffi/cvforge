# Stage 2 — Design

Agent: designer
Verdict: passed

The existing `/notifications` page remains the single user-facing control point. A new "Préférences email" card sits above the activity feed, so users can manage delivery without hunting for a separate settings route. This keeps the experience aligned with vision `§14.2` and `§14.3`: the center shows notification activity and also exposes per-type email toggles.

Interaction rules:

- two explicit checkboxes for the currently implemented email-capable types:
  - relance candidature `J+7`;
  - achat de crédits confirmé;
- one save action using a native form submit;
- visible provider/status line so the user can see whether SMTP delivery is configured.

Accessibility notes:

- preferences use native checkbox inputs and a native submit button;
- explanatory copy stays adjacent to each control;
- no modal or JS-only interaction is required.
