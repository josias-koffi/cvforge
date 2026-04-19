# Stage 02 — Design

## Proposed Direction

- Keep `packages/ui` as the single source for design-system primitives.
- Layer shadcn-style component APIs on top of the existing "Papier & Crayon" token set instead of creating app-local styles.
- Add one shared style injector and reuse it in both Next.js apps so the primitives render consistently without duplicating CSS per page.

## Component Set

- `Button` with `primary`, `secondary`, and `ghost` variants plus compact and large touch targets.
- `Badge` for compact status and metadata surfaces.
- `Card` primitives for grouped surfaces.
- `Label`, `Input`, and `Textarea` for accessible forms.

## Accessibility Notes

- Preserve semantic `label` to input relationships.
- Keep visible focus indicators for keyboard navigation.
- Use tokenized text/background combinations that maintain readable contrast within the neutral palette.

## UX Risk

- The repo does not yet use Tailwind or the shadcn CLI. The design therefore adopts the shadcn component conventions and helper runtime in `packages/ui` while keeping styling compatible with the current stack.
