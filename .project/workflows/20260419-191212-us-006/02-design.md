# Stage 2 — Design

## Proposed Direction

- Centralize color, typography, spacing, radius, shadow, and breakpoint tokens in `packages/ui/src/design-system.ts`.
- Feed those tokens into the shared `AppShell` via CSS custom properties so both existing Next apps inherit the same visual language.
- Keep the base composition intentionally simple: a paper-like hero panel and three supporting cards that demonstrate palette, typography, and mobile-first spacing rules.

## UX / UI Notes

- Palette follows warm ivory surfaces, charcoal text, muted stone secondary text, and a sand accent from the vision.
- Typography is split into display, body, document, and mono roles to match the intended use across marketing, product UI, and generated documents.
- Layout defaults to one column for mobile and upgrades to a three-card grid from `768px`, satisfying the story's mobile-first constraint.

## Accessibility Notes

- Text uses high-contrast dark tones on light surfaces.
- The shell remains semantic with heading structure and an `aria-label` on the supporting section.
- Spacing is increased on touch-first layouts rather than compressed for desktop first.
